'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { getSOLBalance, getSPLTokenBalances, type TokenBalance } from '@/lib/solana';
import { getMarketData, type CoinMarketData } from '@/lib/coingecko';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';

interface PortfolioToken {
  symbol: string;
  name: string;
  balance: number;
  valueUsd: number;
  price: number;
  change24h: number;
  percentOfPortfolio: number;
  logoURI?: string;
}

export function AnalyticsPage() {
  const { wallet, setCurrentPage, rpcEndpoint } = useWalletContext();
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  // Load portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!wallet) return;
    setIsLoadingPortfolio(true);
    try {
      const [solBalance, splTokens, marketData] = await Promise.all([
        getSOLBalance(wallet.publicKey, rpcEndpoint).catch(() => 0),
        getSPLTokenBalances(wallet.publicKey, rpcEndpoint).catch(() => []),
        getMarketData().catch(() => []),
      ]);

      const solMarket = marketData.find((c) => c.id === 'solana');
      const solPrice = solMarket?.current_price || 0;
      const solChange = solMarket?.price_change_percentage_24h || 0;

      const tokens: PortfolioToken[] = [];
      let total = 0;

      // Add SOL
      if (solBalance > 0) {
        const solValue = solBalance * solPrice;
        total += solValue;
        tokens.push({
          symbol: 'SOL',
          name: 'Solana',
          balance: solBalance,
          valueUsd: solValue,
          price: solPrice,
          change24h: solChange,
          percentOfPortfolio: 0,
          logoURI: solMarket?.image,
        });
      }

      // Add SPL tokens with price data from GeckoTerminal
      const splWithBalance = splTokens.filter((t) => t.balance > 0);
      if (splWithBalance.length > 0) {
        const batchSize = 5;
        for (let i = 0; i < splWithBalance.length; i += batchSize) {
          const batch = splWithBalance.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(async (token) => {
              let price = 0;
              let change24h = 0;
              let logoURI = token.logoURI;
              let symbol = token.symbol || token.mint.slice(0, 4);
              let name = token.name || 'Unknown Token';

              try {
                const resp = await fetch(
                  `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${token.mint}`
                );
                if (resp.ok) {
                  const data = await resp.json();
                  const attrs = data?.data?.attributes;
                  if (attrs) {
                    price = parseFloat(attrs.price_usd) || 0;
                    change24h = attrs.price_change_percentage?.h24
                      ? parseFloat(attrs.price_change_percentage.h24)
                      : 0;
                    if (attrs.image_url && attrs.image_url !== 'missing.png' && attrs.image_url.startsWith('http')) {
                      logoURI = attrs.image_url;
                    }
                    if (attrs.name) name = attrs.name;
                    if (attrs.symbol) symbol = attrs.symbol;
                  }
                }
              } catch {
                // use defaults
              }

              const valueUsd = token.balance * price;
              total += valueUsd;

              return {
                symbol,
                name,
                balance: token.balance,
                valueUsd,
                price,
                change24h,
                percentOfPortfolio: 0,
                logoURI,
              } as PortfolioToken;
            })
          );

          for (const result of results) {
            if (result.status === 'fulfilled') {
              tokens.push(result.value);
            }
          }
        }
      }

      // Calculate percentages
      for (const token of tokens) {
        token.percentOfPortfolio = total > 0 ? (token.valueUsd / total) * 100 : 0;
      }

      // Sort by value descending
      tokens.sort((a, b) => b.valueUsd - a.valueUsd);

      setPortfolioTokens(tokens);
      setTotalValue(total);
    } catch {
      setPortfolioTokens([]);
      setTotalValue(0);
    } finally {
      setIsLoadingPortfolio(false);
    }
  }, [wallet, rpcEndpoint]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Request AI analysis
  const handleAnalyze = async () => {
    if (portfolioTokens.length === 0) {
      setError('Portfolio is empty. Add tokens to start analysis.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: portfolioTokens,
          totalValueUsd: totalValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to analyze portfolio.');
        return;
      }

      setAnalysis(data.analysis);
      setLastAnalyzed(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setError('Failed to connect to AI. Please check your internet connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!wallet) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#050a12] animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">AI Analytics</h1>
        <button
          onClick={() => fetchPortfolio()}
          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* AI Badge */}
      <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30">
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-xs text-purple-300 font-medium">
          Powered by Grokie AI — Smart portfolio analysis
        </span>
      </div>

      {/* Portfolio Summary */}
      {isLoadingPortfolio ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading portfolio..." />
        </div>
      ) : (
        <>
          {/* Portfolio Overview Card */}
          <div className="mx-5 mb-4 rounded-xl bg-[#0c1929] border border-[#1a3a5c] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Your Portfolio</span>
              <span className="text-xs text-gray-500">
                {portfolioTokens.length} token{portfolioTokens.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Token allocation bars */}
            <div className="space-y-2.5">
              {portfolioTokens.map((token) => (
                <div key={token.symbol} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 shrink-0">
                    {token.logoURI ? (
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#1a2a3a] flex items-center justify-center">
                        <span className="text-[8px] text-gray-400 font-bold">{token.symbol.slice(0, 2)}</span>
                      </div>
                    )}
                    <span className="text-xs text-white font-medium truncate">{token.symbol}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-[#1a2a3a] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${Math.max(token.percentOfPortfolio, 1)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {token.percentOfPortfolio.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {portfolioTokens.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-4">
                Portfolio is empty. Add tokens to start analysis.
              </p>
            )}
          </div>

          {/* Analyze Button */}
          <div className="mx-5 mb-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || portfolioTokens.length === 0}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI is analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze Portfolio with AI
                </>
              )}
            </button>
            {lastAnalyzed && (
              <p className="text-[10px] text-gray-600 text-center mt-1.5">
                Last analyzed: {lastAnalyzed}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* AI Analysis Result */}
          {analysis && (
            <div className="mx-5 mb-4 rounded-xl bg-[#0c1929] border border-purple-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-semibold text-purple-300">AI Analysis Result</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {analysis}
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mx-5 mt-2 px-3 py-2 rounded-lg bg-yellow-900/10 border border-yellow-600/20">
            <p className="text-[10px] text-yellow-600/80 leading-relaxed">
              ⚠️ Disclaimer: This analysis is generated by AI and does not constitute financial advice. 
              Always do your own research (DYOR) before making any investment decisions.
            </p>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
