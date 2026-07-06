import { NextRequest, NextResponse } from 'next/server';

/**
 * Jupiter Swap API Proxy
 * Uses Jupiter Swap API v2 to avoid CORS issues.
 * Includes retry logic for reliability.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Use Jupiter Swap API v2
  const endpoint = 'https://api.jup.ag/swap/v2/swap';

  // Retry up to 3 times
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'GrokieWallet/1.0',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.swapTransaction) {
          return NextResponse.json(data);
        }
      }

      // Rate limited or server error - wait and retry
      if (response.status === 429 || response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      // Client error (4xx) - don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => null);
        return NextResponse.json(
          { error: errorData?.error || 'Swap transaction failed' },
          { status: response.status }
        );
      }
    } catch {
      // Network error - wait and retry
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return NextResponse.json({ error: 'Failed to get swap transaction. Please try again.' }, { status: 500 });
}
