import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Assistant API Route
 * Uses Groq AI to provide structured portfolio recommendations.
 * Returns JSON with risk level, token advice, and rebalance suggestions.
 */

// Fix SSL certificate issues in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

interface PortfolioToken {
  symbol: string;
  name: string;
  mint: string;
  balance: number;
  valueUsd: number;
  price: number;
  change24h: number;
  percent: number;
}

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    return NextResponse.json(
      { error: 'Groq API key not configured. Add GROQ_API_KEY to .env.local' },
      { status: 500 }
    );
  }

  try {
    const { tokens, totalValueUsd } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'No tokens to analyze.' }, { status: 400 });
    }

    const portfolioSummary = (tokens as PortfolioToken[])
      .map(
        (t) =>
          `- ${t.symbol} (${t.name}): balance=${t.balance.toFixed(4)}, value=$${t.valueUsd.toFixed(2)}, allocation=${t.percent.toFixed(1)}%, price=$${t.price}, 24h_change=${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(2)}%`
      )
      .join('\n');

    const systemPrompt = `You are a crypto portfolio AI assistant. Analyze the portfolio and respond with ONLY a valid JSON object (no markdown, no code blocks, no extra text). Use this exact structure:

{"riskLevel":"Low","summary":"text","tokenAdvice":[{"symbol":"TOKEN","action":"HOLD","reason":"text"}],"rebalanceSuggestion":"text","suggestedAllocation":[{"symbol":"TOKEN","currentPercent":50,"suggestedPercent":40}]}

Valid riskLevel values: "Low", "Medium", "High", "Very High"
Valid action values: "HOLD", "BUY MORE", "REDUCE", "SELL"

Rules:
- memecoins (BONK, WIF, PEPE, DOGE, SHIB, TRUMP, GROKIE) = very high risk
- SOL = medium risk, essential for gas fees (always keep minimum 0.01 SOL)
- Stablecoins (USDC, USDT) = low risk
- If 1 token is >60% of portfolio, risk is High or Very High
- If portfolio has no stablecoin, suggest adding some
- RESPOND WITH ONLY THE JSON OBJECT. NO MARKDOWN. NO CODE BLOCKS. NO EXPLANATION.`;

    const userPrompt = `Portfolio (total $${totalValueUsd.toFixed(2)}):
${portfolioSummary}`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid Groq API key.' }, { status: 401 });
      }
      if (response.status === 429) {
        return NextResponse.json({ error: 'Rate limited. Please wait and try again.' }, { status: 429 });
      }

      return NextResponse.json({ error: `AI failed (${response.status}).` }, { status: 500 });
    }

    const data = await response.json();
    const aiContent = data?.choices?.[0]?.message?.content || '';

    // Try to parse the JSON response
    try {
      // Extract JSON from response (handle markdown code blocks and extra text)
      let jsonStr = aiContent.trim();
      
      // Remove markdown code block wrappers
      if (jsonStr.includes('```')) {
        const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        } else {
          // Fallback: strip all ``` markers
          jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/\n?```/g, '').trim();
        }
      }
      
      // If there's text before the JSON object, extract just the JSON
      const jsonStartIndex = jsonStr.indexOf('{');
      const jsonEndIndex = jsonStr.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonStartIndex < jsonEndIndex) {
        jsonStr = jsonStr.slice(jsonStartIndex, jsonEndIndex + 1);
      }

      const recommendation = JSON.parse(jsonStr);

      // Validate structure
      if (!recommendation.riskLevel || !recommendation.tokenAdvice) {
        throw new Error('Invalid structure');
      }

      return NextResponse.json({
        recommendation,
        rawAnalysis: aiContent,
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw content:', aiContent);
      // If JSON parse fails, return raw analysis with fallback
      return NextResponse.json({
        recommendation: {
          riskLevel: 'Medium',
          summary: 'AI analysis completed. See detailed analysis below.',
          tokenAdvice: (tokens as PortfolioToken[]).map((t) => ({
            symbol: t.symbol,
            action: 'HOLD' as const,
            reason: 'Unable to parse detailed advice. Check full analysis.',
          })),
          rebalanceSuggestion: 'Consider diversifying your portfolio.',
          suggestedAllocation: [],
        },
        rawAnalysis: aiContent,
      });
    }
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze portfolio. Please try again.' },
      { status: 500 }
    );
  }
}
