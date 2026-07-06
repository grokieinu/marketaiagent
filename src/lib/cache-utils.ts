/**
 * Token Metadata Cache Utility
 * Cache GeckoTerminal API responses in localStorage with TTL
 */

interface CachedTokenMetadata {
  symbol: string;
  name: string;
  logoURI?: string;
  timestamp: number; // for TTL check
}

const CACHE_KEY_PREFIX = 'grokie_token_cache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get token metadata from cache or GeckoTerminal
 */
export async function getTokenMetadata(
  mint: string,
  options?: { skipCache?: boolean }
): Promise<{ symbol: string; name: string; logoURI?: string } | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${mint}`;
  
  // Try cache dulu
  if (!options?.skipCache) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: CachedTokenMetadata = JSON.parse(cached);
        const now = Date.now();
        
        // Check if still valid (TTL)
        if (now - parsed.timestamp < CACHE_TTL) {
          return {
            symbol: parsed.symbol,
            name: parsed.name,
            logoURI: parsed.logoURI,
          };
        } else {
          // Expired, delete
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (err) {
      console.warn(`Cache read error for ${mint}:`, err);
    }
  }

  // Fetch from GeckoTerminal
  try {
    const resp = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`
    );
    
    if (!resp.ok) return null;
    
    const data = await resp.json();
    const attrs = data?.data?.attributes;
    
    if (!attrs) return null;

    let logoURI = undefined;
    if (
      attrs.image_url &&
      attrs.image_url !== 'missing.png' &&
      attrs.image_url.startsWith('http')
    ) {
      logoURI = attrs.image_url;
    }

    const metadata = {
      symbol: attrs.symbol || 'Unknown',
      name: attrs.name || 'Unknown Token',
      logoURI,
    };

    // Save to cache
    try {
      const cacheData: CachedTokenMetadata = {
        ...metadata,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (cacheErr) {
      console.warn(`Cache write error for ${mint}:`, cacheErr);
    }

    return metadata;
  } catch (err) {
    console.error(`GeckoTerminal fetch error for ${mint}:`, err);
    return null;
  }
}

/**
 * Batch fetch metadata with parallel requests
 */
export async function getTokenMetadataBatch(
  mints: string[],
  options?: { skipCache?: boolean }
): Promise<Map<string, { symbol: string; name: string; logoURI?: string }>> {
  const results = new Map();
  
  // Fetch all in parallel
  const promises = mints.map(async (mint) => {
    const metadata = await getTokenMetadata(mint, options);
    if (metadata) {
      results.set(mint, metadata);
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Clear cache (for testing or manual refresh)
 */
export function clearTokenCache(mint?: string) {
  if (mint) {
    const cacheKey = `${CACHE_KEY_PREFIX}${mint}`;
    localStorage.removeItem(cacheKey);
  } else {
    // Clear all token cache
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}
