/**
 * GROKIE Wallet - Jupiter Swap Aggregator Integration
 * 
 * Uses Jupiter API v2 for quotes and swap execution.
 * URL: https://api.jup.ag/swap/v2
 * 
 * Features:
 * - Quote error validation
 * - Retry with dynamic slippage
 * - Accurate decimals via RPC
 * - Volatile token support
 */

import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// ===================== CONSTANTS =====================
// Use Jupiter Swap API v2
const JUPITER_QUOTE_API = 'https://api.jup.ag/swap/v2';

// Volatile tokens (mint addresses) — require higher slippage
const VOLATILE_TOKENS = new Set([
  '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', // TRUMP
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'A1zgiEn7j53myGBLQ1b4ccdeMJsbjiXTaidSrsjoFTRv', // GROKIE
  // Add other problematic token mints here
]);

// ===================== TYPE =====================
export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  // Additional field for error handling
  error?: string;
}

export interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface JupiterTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// ===================== POPULAR TOKENS =====================
export const POPULAR_TOKENS = [
  { symbol: 'GROKIE', name: 'Grokie Inu', mint: 'A1zgiEn7j53myGBLQ1b4ccdeMJsbjiXTaidSrsjoFTRv', decimals: 9, logoURI: '/grokie.png' },
  { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9, logoURI: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png' },
  { symbol: 'USDT', name: 'Tether USD', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, logoURI: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png' },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, logoURI: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png' },
  { symbol: 'JUP', name: 'Jupiter', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, logoURI: 'https://static.jup.ag/jup/icon.png' },
];

// ===================== HELPER FUNCTIONS =====================

/**
 * Get token decimals from RPC (accurate)
 */
export async function getTokenDecimals(mintAddress: string, connection: Connection): Promise<number> {
  try {
    const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const parsed = mintInfo?.value?.data as any;
    if (parsed?.parsed?.info?.decimals !== undefined) {
      return parsed.parsed.info.decimals;
    }
    // Try from popular tokens
    const found = POPULAR_TOKENS.find(t => t.mint === mintAddress);
    if (found) return found.decimals;
    return 6; // safe fallback
  } catch {
    return 6;
  }
}

/**
 * Check if a token is considered volatile
 */
function isVolatileToken(mint: string): boolean {
  return VOLATILE_TOKENS.has(mint);
}

/**
 * Convert UI amount to raw amount
 */
export function toRawAmount(amount: number, decimals: number): string {
  return Math.floor(amount * Math.pow(10, decimals)).toString();
}

/**
 * Convert raw amount to UI amount
 */
export function fromRawAmount(rawAmount: string, decimals: number): number {
  return parseInt(rawAmount) / Math.pow(10, decimals);
}

// ===================== SEARCH CACHE =====================
interface SearchCacheEntry {
  results: JupiterTokenInfo[];
  timestamp: number;
}

const SEARCH_CACHE = new Map<string, SearchCacheEntry>();
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with built-in timeout
 */
async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===================== TOKEN SEARCH =====================

export async function searchTokens(query: string): Promise<JupiterTokenInfo[]> {
  try {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    // Check cache first
    const cached = SEARCH_CACHE.get(trimmed);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      console.log(`→ Using cached search results for: ${trimmed}`);
      return cached.results;
    }

    const isAddress = /^[1-9A-HJ-NP-Za-km-z]{30,50}$/.test(trimmed);

    let results: JupiterTokenInfo[] = [];

    if (isAddress) {
      results = await searchTokenByAddress(trimmed);
    } else {
      results = await searchTokenByNameOrSymbol(trimmed);
    }

    // Save to cache
    if (results.length > 0) {
      SEARCH_CACHE.set(trimmed, {
        results,
        timestamp: Date.now(),
      });
    }

    return results;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Search error: ${errMsg}`);
    return [];
  }
}

/**
 * Search token by contract address
 */
async function searchTokenByAddress(address: string): Promise<JupiterTokenInfo[]> {
  console.log(`→ Searching token by address: ${address}`);

  // Try Jupiter Token API v2
  try {
    const resp = await fetchWithTimeout(`https://lite-api.jup.ag/tokens/v2/${address}`, {}, 3000);
    if (resp.ok) {
      const token = await resp.json();
      if (token?.address) {
        console.log(`✓ Found on Jupiter API: ${token.symbol}`);
        return [{
          address: token.address,
          symbol: token.symbol || 'Unknown',
          name: token.name || 'Unknown Token',
          decimals: token.decimals || 9,
          logoURI: token.logoURI,
        }];
      }
    }
  } catch (err) {
    console.warn(`⚠ Jupiter API search failed:`, err instanceof Error ? err.message : String(err));
  }

  // Try GeckoTerminal
  try {
    const resp = await fetchWithTimeout(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}`,
      {},
      3000
    );
    if (resp.ok) {
      const data = await resp.json();
      const attrs = data?.data?.attributes;
      if (attrs) {
        let logo = undefined;
        if (attrs.image_url && attrs.image_url !== 'missing.png' && attrs.image_url.startsWith('http')) {
          logo = attrs.image_url;
        }
        console.log(`✓ Found on GeckoTerminal: ${attrs.symbol}`);
        return [{
          address,
          symbol: attrs.symbol || 'Unknown',
          name: attrs.name || 'Unknown Token',
          decimals: attrs.decimals || 9,
          logoURI: logo,
        }];
      }
    }
  } catch (err) {
    console.warn(`⚠ GeckoTerminal search failed:`, err instanceof Error ? err.message : String(err));
  }

  // Fallback: Try quote endpoint to check if swappable
  try {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const quoteResp = await fetchWithTimeout(
      `${JUPITER_QUOTE_API}/quote?inputMint=${SOL_MINT}&outputMint=${address}&amount=1000000000&slippageBps=200`,
      {},
      5000
    );
    if (quoteResp.ok) {
      const quoteData = await quoteResp.json();
      if (quoteData && !quoteData.error) {
        let symbol = address.slice(0, 4).toUpperCase();
        let name = `Token ${address.slice(0, 6)}...${address.slice(-4)}`;
        let logoURI = undefined;

        // Try metadata from GeckoTerminal
        try {
          const metaResp = await fetchWithTimeout(
            `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${address}`,
            {},
            2000
          );
          if (metaResp.ok) {
            const meta = await metaResp.json();
            const attrs = meta?.data?.attributes;
            if (attrs) {
              if (attrs.symbol) symbol = attrs.symbol;
              if (attrs.name) name = attrs.name;
              if (attrs.image_url && attrs.image_url !== 'missing.png' && attrs.image_url.startsWith('http')) {
                logoURI = attrs.image_url;
              }
            }
          }
        } catch { /* ignore */ }

        console.log(`✓ Found via quote endpoint (swappable): ${symbol}`);
        return [{
          address,
          symbol,
          name,
          decimals: 9,
          logoURI,
        }];
      }
    }
  } catch (err) {
    console.warn(`⚠ Quote endpoint search failed:`, err instanceof Error ? err.message : String(err));
  }

  console.warn(`✗ Token not found by address: ${address}`);
  return [];
}

/**
 * Search token by name or symbol
 */
async function searchTokenByNameOrSymbol(query: string): Promise<JupiterTokenInfo[]> {
  console.log(`→ Searching token by name/symbol: ${query}`);

  const allResults: JupiterTokenInfo[] = [];
  const seen = new Set<string>();

  // Search Jupiter API first
  try {
    const resp = await fetchWithTimeout(
      `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}&limit=50`,
      {},
      3000
    );
    if (resp.ok) {
      const results = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        for (const t of results) {
          if (t.address && !seen.has(t.address)) {
            allResults.push({
              address: t.address,
              symbol: t.symbol || 'Unknown',
              name: t.name || 'Unknown Token',
              decimals: t.decimals || 9,
              logoURI: t.logoURI,
            });
            seen.add(t.address);
          }
        }
        console.log(`✓ Jupiter API returned ${allResults.length} results`);
      }
    }
  } catch (err) {
    console.warn(`⚠ Jupiter API search failed:`, err instanceof Error ? err.message : String(err));
  }

  // Fallback GeckoTerminal search
  try {
    const resp = await fetchWithTimeout(
      `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(query)}&network=solana`,
      {},
      3000
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data?.data && Array.isArray(data.data)) {
        for (const pool of data.data.slice(0, 30)) {
          const baseTokenId = pool.relationships?.base_token?.data?.id;
          if (!baseTokenId) continue;
          const addr = baseTokenId.replace('solana_', '');
          if (seen.has(addr)) continue;

          const poolAttrs = pool.attributes;
          const tokenSymbol = poolAttrs?.name?.split('/')[0]?.trim() || 'Unknown';

          allResults.push({
            address: addr,
            symbol: tokenSymbol,
            name: tokenSymbol,
            decimals: 9,
            logoURI: undefined,
          });
          seen.add(addr);
        }
        console.log(`✓ GeckoTerminal returned ${allResults.length - (allResults.length - seen.size)} new results`);
      }
    }
  } catch (err) {
    console.warn(`⚠ GeckoTerminal search failed:`, err instanceof Error ? err.message : String(err));
  }

  return allResults;
}

// ===================== QUOTE =====================

/**
 * Get a swap quote from Jupiter API v1
 */
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 200
): Promise<JupiterQuote | null> {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippageBps.toString(),
    });

    const response = await fetch(`${JUPITER_QUOTE_API}/quote?${params}`);
    if (!response.ok) {
      // Try to read error from body
      const errorBody = await response.text();
      throw new Error(`Quote API error ${response.status}: ${errorBody}`);
    }

    const json = await response.json();
    // If response has error property, throw it
    if (json.error) {
      throw new Error(json.error);
    }
    return json;
  } catch (error) {
    console.error('Jupiter quote error:', error);
    return null;
  }
}

/**
 * Get a quote with retry and exponential backoff
 */
async function getQuoteWithRetry(
  inputMint: string,
  outputMint: string,
  amount: string,
  initialSlippage: number = 200,
  maxRetries: number = 3
): Promise<JupiterQuote | null> {
  for (let i = 0; i < maxRetries; i++) {
    const currentSlippage = initialSlippage + (i * 100); // 200, 300, 400
    const quote = await getSwapQuote(inputMint, outputMint, amount, currentSlippage);
    if (quote) {
      return quote;
    }
    
    // Exponential backoff + jitter (not a fixed delay)
    if (i < maxRetries - 1) {
      const baseDelay = Math.pow(2, i) * 100; // 100ms, 200ms, 400ms
      const jitter = Math.random() * 100; // +0-100ms random
      const totalDelay = baseDelay + jitter;
      console.log(`→ Quote retry ${i + 1}/${maxRetries - 1}: waiting ${Math.round(totalDelay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  return null;
}

// ===================== SWAP EXECUTION =====================

/**
 * Execute swap with error handling and retry
 * @param quote - Initial quote (used for parameters, will be refreshed)
 * @param userPublicKey - User's public key
 * @param privateKeyBase58 - Private key in Base58 format
 * @param rpcEndpoint - RPC endpoint for connection
 * @param customSlippage - Optional slippage (if not provided, auto-determined)
 */
export async function executeSwap(
  quote: JupiterQuote,
  userPublicKey: string,
  privateKeyBase58: string,
  rpcEndpoint: string,
  customSlippage?: number
): Promise<SwapResult> {
  try {
    // Validate private key
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
    } catch {
      return { success: false, error: 'Invalid private key format' };
    }

    // Determine dynamic slippage
    let slippageBps = customSlippage ?? quote.slippageBps ?? 200;
    const isVol = isVolatileToken(quote.inputMint) || isVolatileToken(quote.outputMint);
    if (isVol && !customSlippage) {
      slippageBps = 500; // 5% for volatile tokens
    }

    // Ensure amount > 0 (raw)
    if (BigInt(quote.inAmount) <= 0) {
      return { success: false, error: 'Amount too small (raw amount is zero)' };
    }

    // Get fresh quote with retry
    const freshQuote = await getQuoteWithRetry(
      quote.inputMint,
      quote.outputMint,
      quote.inAmount,
      slippageBps,
      3
    );

    if (!freshQuote) {
      return { success: false, error: 'Failed to get a valid quote after retries. Try increasing slippage or amount.' };
    }

    // Ensure fresh quote has no error
    if ((freshQuote as any).error) {
      return { success: false, error: `Quote error: ${(freshQuote as any).error}` };
    }

    // Get swap transaction from Jupiter
    const swapResponse = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: freshQuote,
        userPublicKey,
        taker: userPublicKey, 
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      throw new Error(`Swap transaction API error: ${swapResponse.status} - ${errorText}`);
    }

    const swapData = await swapResponse.json();
    if (swapData.error) {
      throw new Error(`Swap error: ${swapData.error}`);
    }

    const { swapTransaction } = swapData;
    if (!swapTransaction) {
      throw new Error('No swapTransaction in response');
    }

    // Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    const connection = new Connection(rpcEndpoint, 'confirmed');

    // Phase 1: Send transaction (NO RETRY - fail fast)
    console.log(`→ Phase 1: Preparing to send transaction...`);
    let signature: string;
    let sentBlockhash: { blockhash: string; lastValidBlockHeight: number };

    try {
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      const signedTransaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Use latest blockhash
      signedTransaction.message.recentBlockhash = latestBlockhash.blockhash;
      signedTransaction.sign([keypair]);

      const rawTx = signedTransaction.serialize();
      signature = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false, // Enable preflight for client-side validation
        maxRetries: 0,
      });

      sentBlockhash = latestBlockhash;
      console.log(`✓ Phase 1: Transaction sent. Signature: ${signature}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`✗ Phase 1: Failed to send transaction. Error: ${errMsg}`);
      return { success: false, error: `Failed to send transaction: ${errMsg}` };
    }

    // Phase 2: Confirm transaction with 15s timeout
    console.log(`→ Phase 2: Starting confirmation with signature ${signature}...`);

    try {
      // Use Promise.race to implement 15s timeout
      const confirmation = await Promise.race([
        connection.confirmTransaction(
          {
            signature,
            blockhash: sentBlockhash.blockhash,
            lastValidBlockHeight: sentBlockhash.lastValidBlockHeight,
          },
          'confirmed'
        ),
        new Promise<any>((_, reject) =>
          setTimeout(
            () => reject(new Error('Confirmation timeout: exceeded 15 seconds')),
            15000 // 15 second timeout
          )
        ),
      ]);

      if (confirmation.value.err) {
        // Transaction landed on-chain but with error
        const errMsg = `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`;
        console.error(`✗ Phase 2: On-chain error detected. ${errMsg}`);
        return { success: false, error: errMsg };
      }

      console.log(`✓ Phase 2: Transaction confirmed!`);
      return { success: true, signature };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠ Phase 2: Confirmation attempt failed. Error: ${errMsg}`);

      // Final status check - don't assume failure, check actual blockchain status
      console.log(`→ Phase 2: Doing final status check before declaring failure...`);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const status = await connection.getSignatureStatus(signature);

        if (status.value) {
          if (
            status.value.confirmationStatus === 'confirmed' ||
            status.value.confirmationStatus === 'finalized' ||
            (status.value.confirmations && status.value.confirmations > 0)
          ) {
            // Transaction actually confirmed on blockchain
            console.log(`✓ Phase 2: Final status check SUCCESS - transaction confirmed on-chain! Status: ${status.value.confirmationStatus}`);
            return { success: true, signature };
          }
        }
      } catch (finalCheckError) {
        const finalCheckMsg = finalCheckError instanceof Error ? finalCheckError.message : String(finalCheckError);
        console.warn(`⚠ Phase 2: Final status check threw error:`, finalCheckMsg);
      }

      // Truly failed
      console.error(`✗ Phase 2: Transaction confirmation failed. User must retry manually.`);
      return {
        success: false,
        error: `Transaction confirmation failed: ${errMsg}. Please try again.`,
      };
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}