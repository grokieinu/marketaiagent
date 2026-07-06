import { NextRequest, NextResponse } from 'next/server';

/**
 * Portfolio Analytics API Route
 * Uses Groq AI to analyze wallet portfolio and provide recommendations.
 * Server-side only — GROQ_API_KEY never exposed to client.
 */

// Fix SSL certificate issues in development (proxy/firewall/antivirus intercepting SSL)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

interface PortfolioToken {
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number;
  price: number;
  change24h: number;
  percentOfPortfolio: number;
}

interface AnalyticsRequest {
  tokens: PortfolioToken[];
  totalValueUsd: number;
}

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    return NextResponse.json(
      { error: 'Groq API key not configured. Please add GROQ_API_KEY to .env.local' },
      { status: 500 }
    );
  }

  try {
    const body: AnalyticsRequest = await request.json();
    const { tokens, totalValueUsd } = body;

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'No tokens in portfolio to analyze.' },
        { status: 400 }
      );
    }

    // Build portfolio summary for AI
    const portfolioSummary = tokens
      .map(
        (t) =>
          `- ${t.symbol} (${t.name}): ${t.balance.toFixed(4)} tokens, $${t.valueUsd.toFixed(2)} (${t.percentOfPortfolio.toFixed(1)}% of portfolio), price: $${t.price}, 24h change: ${t.change24h >= 0 ? '+' : ''}${t.change24h.toFixed(2)}%`
      )
      .join('\n');

    const systemPrompt = `You are a professional crypto portfolio analyst AI assistant for GROKIE Wallet on Solana blockchain. 
Your job is to analyze the user's current portfolio and provide:
1. Overall portfolio health assessment (diversification, risk level)
2. For EACH token: recommendation to HOLD, BUY MORE, or REDUCE with brief reason
3. Portfolio proportion analysis — is the allocation balanced?
4. Top 2-3 actionable suggestions to improve the portfolio

Rules:
- Be concise but insightful
- Use data-driven reasoning (24h trends, allocation %)
- Consider that memecoins are high-risk, stablecoins are low-risk, SOL is the native gas token
- Always remind to keep some SOL for gas fees
- If portfolio is very concentrated in one token, flag it
- Respond in English
- Format your response with clear sections using emoji headers
- Keep total response under 500 words`;

    const userPrompt = `Analyze my crypto portfolio on Solana:

Total Portfolio Value: $${totalValueUsd.toFixed(2)}

Token Holdings:
${portfolioSummary}

Provide a complete analysis and recommendation for each token.`;

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
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Groq API key. Please check your GROQ_API_KEY in .env.local' },
          { status: 401 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: `AI analysis failed (${response.status}). Please try again.` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data?.choices?.[0]?.message?.content || 'No analysis available.';

    return NextResponse.json({ analysis: aiResponse });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze portfolio. Please try again.' },
      { status: 500 }
    );
  }
}
