'use client';

import { useState } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { Toast } from '@/components/ui/Toast';

interface DApp {
  name: string;
  description: string;
  url: string;
  icon: string;
  category: 'defi' | 'nft' | 'gaming' | 'tools' | 'social';
}

const FEATURED_DAPPS: DApp[] = [
  {
    name: 'Jupiter',
    description: 'Best swap aggregator on Solana',
    url: 'https://jup.ag',
    icon: 'https://static.jup.ag/jup/icon.png',
    category: 'defi',
  },
  {
    name: 'Raydium',
    description: 'AMM & liquidity provider',
    url: 'https://raydium.io',
    icon: 'https://img.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png',
    category: 'defi',
  },
  {
    name: 'Marinade',
    description: 'Liquid staking protocol',
    url: 'https://marinade.finance',
    icon: 'https://app.marinade.finance/favicon.ico',
    category: 'defi',
  },
  {
    name: 'Tensor',
    description: 'NFT marketplace & trading',
    url: 'https://www.tensor.trade',
    icon: 'https://www.tensor.trade/favicon.ico',
    category: 'nft',
  },
  {
    name: 'Magic Eden',
    description: 'Leading NFT marketplace',
    url: 'https://magiceden.io',
    icon: 'https://magiceden.io/favicon.ico',
    category: 'nft',
  },
  {
    name: 'Meteora',
    description: 'Dynamic liquidity protocols',
    url: 'https://www.meteora.ag',
    icon: 'https://www.meteora.ag/favicon.ico',
    category: 'defi',
  },
  {
    name: 'Drift',
    description: 'Perpetual futures DEX',
    url: 'https://app.drift.trade',
    icon: 'https://app.drift.trade/favicon.ico',
    category: 'defi',
  },
  {
    name: 'Phantom',
    description: 'Swap & manage tokens',
    url: 'https://phantom.app',
    icon: 'https://phantom.app/favicon.ico',
    category: 'tools',
  },
  {
    name: 'Solscan',
    description: 'Solana block explorer',
    url: 'https://solscan.io',
    icon: 'https://solscan.io/favicon.ico',
    category: 'tools',
  },
  {
    name: 'Birdeye',
    description: 'Token analytics & charts',
    url: 'https://birdeye.so',
    icon: 'https://birdeye.so/favicon.ico',
    category: 'tools',
  },
  {
    name: 'DexScreener',
    description: 'DEX analytics platform',
    url: 'https://dexscreener.com/solana',
    icon: 'https://dexscreener.com/favicon.ico',
    category: 'tools',
  },
  {
    name: 'Pump.fun',
    description: 'Launch & discover tokens',
    url: 'https://pump.fun',
    icon: 'https://pump.fun/favicon.ico',
    category: 'defi',
  },
  {
    name: 'Orca',
    description: 'Concentrated liquidity DEX',
    url: 'https://www.orca.so',
    icon: 'https://www.orca.so/favicon.ico',
    category: 'defi',
  },
  {
    name: 'Jito',
    description: 'MEV-powered staking',
    url: 'https://www.jito.network',
    icon: 'https://www.jito.network/favicon.ico',
    category: 'defi',
  },
  {
    name: 'Star Atlas',
    description: 'Space exploration game',
    url: 'https://staratlas.com',
    icon: 'https://staratlas.com/favicon.ico',
    category: 'gaming',
  },
  {
    name: 'Dialect',
    description: 'Web3 messaging & notifications',
    url: 'https://www.dialect.to',
    icon: 'https://www.dialect.to/favicon.ico',
    category: 'social',
  },
];

type Category = 'all' | 'defi' | 'nft' | 'gaming' | 'tools' | 'social';

export function BrowserPage() {
  const { wallet, setCurrentPage } = useWalletContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'defi', label: 'DeFi' },
    { key: 'nft', label: 'NFT' },
    { key: 'tools', label: 'Tools' },
    { key: 'gaming', label: 'Gaming' },
    { key: 'social', label: 'Social' },
  ];

  const filteredDApps = FEATURED_DAPPS.filter((dapp) => {
    const matchesCategory = activeCategory === 'all' || dapp.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dapp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenDApp = (dapp: DApp) => {
    window.open(dapp.url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenUrl = () => {
    let url = searchQuery.trim();
    if (!url) return;

    // Add https if no protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Check if it's a valid URL
    try {
      new URL(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setToast({ message: 'Invalid URL. Please enter a valid web address.', type: 'error' });
    }
  };

  const handleCopyAddress = async () => {
    if (wallet) {
      await navigator.clipboard.writeText(wallet.publicKey);
      setToast({ message: 'Wallet address copied! Paste it in the DApp to connect.', type: 'success' });
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
        <h1 className="text-lg font-bold text-white">Browser</h1>
        <button
          onClick={handleCopyAddress}
          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Copy wallet address"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Search / URL Bar */}
      <div className="mx-5 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.includes('.')) {
                  handleOpenUrl();
                }
              }}
              placeholder="Search DApps or enter URL..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0c1929] border border-[#1a3a5c] text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
              spellCheck={false}
            />
          </div>
          {searchQuery.includes('.') && (
            <button
              onClick={handleOpenUrl}
              className="px-3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
            >
              Go
            </button>
          )}
        </div>
      </div>

      {/* Wallet Connect Info */}
      <div className="mx-5 mb-4 p-3 rounded-xl bg-[#0c1929] border border-[#1a3a5c]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-300 font-medium mb-1">How to connect</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Open a DApp below, then paste your wallet address when prompted. For DApps requiring wallet signature, use your private key export from Settings.
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyAddress}
          className="mt-2.5 w-full py-2 rounded-lg bg-[#1a2d4a] border border-[#2a4a6a] text-xs text-cyan-400 font-medium hover:bg-[#1e3555] transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy Wallet Address
        </button>
      </div>

      {/* Category Tabs */}
      <div className="px-5 mb-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-[#1a2a3a] text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* DApp Grid */}
      <div className="px-5 flex-1">
        {filteredDApps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No DApps found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredDApps.map((dapp) => (
              <button
                key={dapp.name}
                onClick={() => handleOpenDApp(dapp)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#0c1929] border border-[#1a3a5c] hover:border-cyan-500/40 hover:bg-[#0f1d30] transition-all"
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#1a2a3a] flex items-center justify-center">
                  <img
                    src={dapp.icon}
                    alt={dapp.name}
                    className="w-11 h-11 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs text-gray-400 font-bold">${dapp.name.slice(0, 2)}</span>`;
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-white font-medium leading-tight truncate w-full">{dapp.name}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5 leading-tight line-clamp-1">{dapp.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
