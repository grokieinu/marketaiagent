'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { getSOLBalance, getSPLTokenBalances } from '@/lib/solana';
import { getMarketData } from '@/lib/coingecko';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';

interface PortfolioToken {
  symbol: string;
  name: string;
  mint: string;
  balance: number;
  valueUsd: number;
  price: number;
  change24h: number;
  percent: number;
  logoURI?: string;
}

interface AIRecommendation {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  summary: string;
  tokenAdvice: Array<{
    symbol: string;
    action: 'HOLD' | 'BUY MORE' | 'REDUCE' | 'SELL';
    reason: string;
  }>;
  rebalanceSuggestion: string;
  suggestedAllocation: Array<{
    symbol: string;
    currentPercent: number;
    suggestedPercent: number;
  }>;
}

export function AIAssistantPage() {
  const { wallet, setCurrentPage, rpcEndpoint } = useWalletContext();
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [rawAnalysis, setRawAnalysis] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load portfolio
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

      if (solBalance > 0) {
        const solValue = solBalance * solPrice;
        total += solValue;
        tokens.push({
          symbol: 'SOL',
          name: 'Solana',
          mint: 'So11111111111111111111111111111111111111112',
          balance: solBalance,
          valueUsd: solValue,
          price: solPrice,
          change24h: solChange,
          percent: 0,
          logoURI: solMarket?.image,
        });
      }

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
              } catch { /* use defaults */ }

              const valueUsd = token.balance * price;
              total += valueUsd;

              return {
                symbol,
                name,
                mint: token.mint,
                balance: token.balance,
                valueUsd,
                price,
                change24h,
                percent: 0,
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

      for (const token of tokens) {
        token.percent = total > 0 ? (token.valueUsd / total) * 100 : 0;
      }

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

  // Auto-analyze when portfolio loads
  useEffect(() => {
    if (portfolioTokens.length > 0 && !recommendation && !isAnalyzing && !error) {
      handleAnalyze();
    }
  }, [portfolioTokens]);

  const handleAnalyze = async () => {
    if (portfolioTokens.length === 0) {
      setError('Portfolio is empty.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setRecommendation(null);
    setRawAnalysis(null);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: portfolioTokens,
          totalValueUsd: totalValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to get AI recommendation.');
        return;
      }

      if (data.recommendation) {
        setRecommendation(data.recommendation);
      }
      if (data.rawAnalysis) {
        setRawAnalysis(data.rawAnalysis);
      }
    } catch {
      setError('Failed to connect to AI. Check your internet connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRebalance = () => {
    setCurrentPage('swap');
    setToast({ message: 'Use Swap to rebalance your portfolio based on AI suggestions.', type: 'info' });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'High': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'Very High': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'HOLD': return 'text-blue-400 bg-blue-500/15';
      case 'BUY MORE': return 'text-green-400 bg-green-500/15';
      case 'REDUCE': return 'text-orange-400 bg-orange-500/15';
      case 'SELL': return 'text-red-400 bg-red-500/15';
      default: return 'text-gray-400 bg-gray-500/15';
    }
  };

  if (!wallet) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#050a12] animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">AI Assistant</h1>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isLoadingPortfolio}
          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors disabled:opacity-40"
          title="Refresh analysis"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Loading State */}
      {(isLoadingPortfolio || isAnalyzing) && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-5">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
            <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400 text-center">
            {isLoadingPortfolio ? 'Reading your wallet...' : 'AI is analyzing your portfolio...'}
          </p>
          <p className="text-xs text-gray-600 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Error */}
      {error && !isAnalyzing && (
        <div className="mx-5 mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={handleAnalyze}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Try again →
          </button>
        </div>
      )}

      {/* AI Recommendation */}
      {recommendation && !isAnalyzing && !isLoadingPortfolio && (
        <div className="px-5 space-y-4">
          {/* Risk Assessment Card */}
          <div className="rounded-xl bg-[#0c1929] border border-[#1a3a5c] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Portfolio Risk</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRiskColor(recommendation.riskLevel)}`}>
                {recommendation.riskLevel}
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{recommendation.summary}</p>
          </div>

          {/* Current Allocation */}
          <div className="rounded-xl bg-[#0c1929] border border-[#1a3a5c] p-4">
            <span className="text-xs text-gray-400 uppercase tracking-wider">You Hold</span>
            <div className="mt-3 space-y-2.5">
              {portfolioTokens.map((token) => (
                <div key={token.mint} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#1a2a3a] flex items-center justify-center">
                        <span className="text-[8px] text-gray-400 font-bold">{token.symbol.slice(0, 2)}</span>
                      </div>
                    )}
                    <span className="text-xs text-white font-medium">{token.symbol}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-[#1a2a3a] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${Math.max(token.percent, 2)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-white font-bold w-14 text-right">
                    {token.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Token Advice */}
          <div className="rounded-xl bg-[#0c1929] border border-[#1a3a5c] p-4">
            <span className="text-xs text-gray-400 uppercase tracking-wider">AI Recommendations</span>
            <div className="mt-3 space-y-2.5">
              {recommendation.tokenAdvice.map((advice) => (
                <div key={advice.symbol} className="flex items-start gap-3 py-2 border-b border-[#1a2a3a] last:border-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${getActionColor(advice.action)}`}>
                    {advice.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">{advice.symbol}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{advice.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Rebalance */}
          {recommendation.suggestedAllocation.length > 0 && (
            <div className="rounded-xl bg-[#0c1929] border border-purple-500/20 p-4">
              <span className="text-xs text-purple-300 uppercase tracking-wider font-medium">Suggested Allocation</span>
              <div className="mt-3 space-y-2">
                {recommendation.suggestedAllocation.map((alloc) => (
                  <div key={alloc.symbol} className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{alloc.symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{alloc.currentPercent.toFixed(0)}%</span>
                      <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className={`text-xs font-bold ${alloc.suggestedPercent > alloc.currentPercent ? 'text-green-400' : alloc.suggestedPercent < alloc.currentPercent ? 'text-red-400' : 'text-gray-300'}`}>
                        {alloc.suggestedPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">{recommendation.rebalanceSuggestion}</p>
            </div>
          )}

          {/* Rebalance Button */}
          <button
            onClick={handleRebalance}
            className="w-full py-4 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rebalance Portfolio
          </button>

          {/* Disclaimer */}
          <div className="px-3 py-2 rounded-lg bg-yellow-900/10 border border-yellow-600/20">
            <p className="text-[10px] text-yellow-600/80 leading-relaxed">
              ⚠️ This is AI-generated analysis, not financial advice. Always DYOR before making investment decisions.
            </p>
          </div>
        </div>
      )}

      {/* Empty Portfolio */}
      {!isLoadingPortfolio && !isAnalyzing && portfolioTokens.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="w-16 h-16 rounded-full bg-[#1a2a3a] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm text-center">Your wallet is empty</p>
          <p className="text-gray-600 text-xs text-center mt-1">Add tokens to get AI-powered portfolio recommendations</p>
          <button
            onClick={() => setCurrentPage('receive')}
            className="mt-4 text-cyan-400 hover:text-cyan-300 text-xs font-medium"
          >
            Receive Tokens →
          </button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
