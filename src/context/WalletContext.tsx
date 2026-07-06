'use client';

/**
 * GROKIE Wallet - Wallet Context Provider
 * 
 * Provides wallet state and operations to all components.
 * Manages the application's navigation state and wallet lifecycle.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllWallets, getSettings, saveSettings, type WalletRecord } from '@/lib/storage';
import { getSessionState, lockSession } from '@/lib/session';
import { getDefaultRpcEndpoint } from '@/lib/rpc';

export type AppPage =
  | 'welcome'
  | 'create-wallet'
  | 'import-wallet'
  | 'backup-phrase'
  | 'dashboard'
  | 'assets'
  | 'add-token'
  | 'send'
  | 'receive'
  | 'transactions'
  | 'settings'
  | 'two-factor'
  | 'unlock'
  | 'token-detail'
  | 'swap'
  | 'analytics'
  | 'browser';

interface WalletContextType {
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  wallet: WalletRecord | null;
  setWallet: (wallet: WalletRecord | null) => void;
  isUnlocked: boolean;
  setIsUnlocked: (unlocked: boolean) => void;
  isLoading: boolean;
  rpcEndpoint: string;
  setRpcEndpoint: (endpoint: string) => void;
  refreshWallet: () => Promise<void>;
  lockWallet: () => void;
  tempSeedPhrase: string | null;
  setTempSeedPhrase: (phrase: string | null) => void;
  selectedTokenId: string | null;
  setSelectedTokenId: (id: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPageState] = useState<AppPage>('welcome');
  const [wallet, setWallet] = useState<WalletRecord | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rpcEndpoint, setRpcEndpoint] = useState(getDefaultRpcEndpoint());
  // SECURITY: Temporary seed phrase stored in state only during backup flow
  const [tempSeedPhrase, setTempSeedPhrase] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Navigation with browser history support (enables mobile back button)
  const setCurrentPage = useCallback((page: AppPage) => {
    setCurrentPageState((prev) => {
      // Push to browser history so back button navigates within app
      if (prev !== page) {
        window.history.pushState({ page }, '', '');
      }
      return page;
    });
  }, []);

  // Listen for browser back button (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.page) {
        // Navigate to the page from history without pushing new state
        setCurrentPageState(event.state.page);
      } else {
        // No history state — go to dashboard if unlocked, otherwise stay
        if (isUnlocked) {
          setCurrentPageState('dashboard');
          // Push state so next back press has somewhere to go
          window.history.pushState({ page: 'dashboard' }, '', '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isUnlocked]);

  // Initialize - check if wallet exists
  useEffect(() => {
    const init = async () => {
      try {
        const wallets = await getAllWallets();
        const settings = await getSettings();
        const session = getSessionState();

        if (settings?.rpcEndpoint) {
          // Auto-migrate: if still using old public RPC, upgrade to Helius
          const defaultRpc = getDefaultRpcEndpoint();
          if (settings.rpcEndpoint === 'https://api.mainnet-beta.solana.com') {
            setRpcEndpoint(defaultRpc);
            // Update saved settings to Helius
            settings.rpcEndpoint = defaultRpc;
            await saveSettings(settings);
          } else {
            setRpcEndpoint(settings.rpcEndpoint);
          }
        }

        if (wallets.length > 0) {
          setWallet(wallets[0]);
          if (session.isUnlocked && session.walletId === wallets[0].id) {
            setIsUnlocked(true);
            setCurrentPageState('dashboard');
            // Set initial history state
            window.history.replaceState({ page: 'dashboard' }, '', '');
          } else {
            setCurrentPageState('unlock');
            window.history.replaceState({ page: 'unlock' }, '', '');
          }
        } else {
          setCurrentPageState('welcome');
          window.history.replaceState({ page: 'welcome' }, '', '');
        }
      } catch {
        setCurrentPageState('welcome');
        window.history.replaceState({ page: 'welcome' }, '', '');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Listen for auto-lock events
  useEffect(() => {
    const handleLocked = () => {
      setIsUnlocked(false);
      setCurrentPageState('unlock');
      // SECURITY: Clear temporary sensitive data
      setTempSeedPhrase(null);
    };

    window.addEventListener('grokie-wallet-locked', handleLocked);
    return () => window.removeEventListener('grokie-wallet-locked', handleLocked);
  }, []);

  const refreshWallet = useCallback(async () => {
    const wallets = await getAllWallets();
    if (wallets.length > 0) {
      setWallet(wallets[0]);
    } else {
      setWallet(null);
      setIsUnlocked(false);
      setCurrentPageState('welcome');
    }
  }, []);

  const lockWallet = useCallback(() => {
    lockSession();
    setIsUnlocked(false);
    setTempSeedPhrase(null);
    setCurrentPage('unlock');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        wallet,
        setWallet,
        isUnlocked,
        setIsUnlocked,
        isLoading,
        rpcEndpoint,
        setRpcEndpoint,
        refreshWallet,
        lockWallet,
        tempSeedPhrase,
        setTempSeedPhrase,
        selectedTokenId,
        setSelectedTokenId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}
