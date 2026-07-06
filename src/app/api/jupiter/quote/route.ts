import { NextRequest, NextResponse } from 'next/server';

/**
 * Jupiter Quote API Proxy
 * Uses Jupiter Swap API v2 to avoid CORS issues in browser.
 * Includes retry logic and proper parameters for maximum route availability.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = new URLSearchParams();

  // Forward all query params
  searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  // Ensure restrictIntermediateTokens is false to allow more routes
  if (!params.has('restrictIntermediateTokens')) {
    params.set('restrictIntermediateTokens', 'false');
  }

  // Use Jupiter Swap API v2
  const endpoint = 'https://api.jup.ag/swap/v2/quote';

  // Retry up to 3 times with slight delay
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GrokieWallet/1.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.outAmount && data.outAmount !== '0') {
          return NextResponse.json(data);
        }
      }

      // If we got a 400 error, check if it's a "no route" error - don't retry
      if (response.status === 400) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.error?.includes('No route found') || errorData?.errorCode === 'NO_ROUTES') {
          // Try with different slippage (increase tolerance)
          const currentSlippage = parseInt(params.get('slippageBps') || '50');
          if (attempt === 0 && currentSlippage < 300) {
            params.set('slippageBps', '300');
            continue;
          }
          return NextResponse.json({ error: 'No route found for this swap pair. Try a different token or amount.' }, { status: 404 });
        }
      }

      // Rate limited or server error - wait and retry
      if (response.status === 429 || response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    } catch {
      // Network error - wait and retry
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return NextResponse.json({ error: 'No route found. Jupiter may be temporarily unavailable.' }, { status: 404 });
}
