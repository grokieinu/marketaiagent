'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '@/context/WalletContext';
import { sendSPLToken, isValidSolanaAddress } from '@/lib/solana';
import { getActivePrivateKey } from '@/lib/wallet-manager';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { Toast } from '@/components/ui/Toast';

interface NFTItem {
  mint: string;
  name: string;
  image: string;
  collection?: string;
  description?: string;
}

type SendStep = 'idle' | 'form' | 'confirm' | 'sending' | 'success' | 'error';

export function NFTPage() {
  const { wallet, setCurrentPage, rpcEndpoint } = useWalletContext();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Send NFT state
  const [sendStep, setSendStep] = useState<SendStep>('idle');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendError, setSendError] = useState('');
  const [txSignature, setTxSignature] = useState('');

  const fetchNFTs = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      const rpcUrl = heliusKey
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
        : rpcEndpoint;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'grokie-nft',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: wallet.publicKey,
            page: 1,
            limit: 100,
            displayOptions: { showCollectionMetadata: true },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch NFTs');

      const data = await response.json();
      const assets = data?.result?.items || [];

      const nftList: NFTItem[] = assets
        .filter((asset: any) => {
          const iface = asset.interface;
          return (
            iface === 'V1_NFT' ||
            iface === 'V2_NFT' ||
            iface === 'ProgrammableNFT' ||
            iface === 'V1_PRINT' ||
            iface === 'Custom'
          );
        })
        .map((asset: any) => {
          const content = asset.content;
          const metadata = content?.metadata || {};
          const files = content?.files || [];
          const links = content?.links || {};

          let image = links?.image || content?.json_uri || '';
          if (files.length > 0 && files[0]?.uri) {
            image = files[0].uri;
          }

          if (image.startsWith('ipfs://')) {
            image = image.replace('ipfs://', 'https://nftstorage.link/ipfs/');
          }

          return {
            mint: asset.id,
            name: metadata.name || 'Unnamed NFT',
            image,
            collection: asset.grouping?.[0]?.group_value
              ? metadata.collection?.name || asset.grouping[0].group_value.slice(0, 8) + '...'
              : undefined,
            description: metadata.description || undefined,
          };
        })
        .filter((nft: NFTItem) => nft.image);

      setNfts(nftList);
    } catch (err) {
      console.error('NFT fetch error:', err);
      setNfts([]);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, rpcEndpoint]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  const handleCopyMint = async (mint: string) => {
    await navigator.clipboard.writeText(mint);
    setToast({ message: 'NFT address copied!', type: 'success' });
  };

  const handleStartSend = () => {
    setSendStep('form');
    setRecipientAddress('');
    setSendError('');
    setTxSignature('');
  };

  const handleCancelSend = () => {
    setSendStep('idle');
    setRecipientAddress('');
    setSendError('');
  };

  const handleReviewSend = () => {
    setSendError('');

    if (!recipientAddress.trim()) {
      setSendError('Please enter a recipient address.');
      return;
    }

    if (!isValidSolanaAddress(recipientAddress.trim())) {
      setSendError('Invalid Solana address.');
      return;
    }

    if (wallet && recipientAddress.trim() === wallet.publicKey) {
      setSendError('Cannot send to your own address.');
      return;
    }

    setSendStep('confirm');
  };

  const handleConfirmSend = async () => {
    if (!wallet || !selectedNFT) return;

    const privateKey = getActivePrivateKey();
    if (!privateKey) {
      setSendError('Session expired. Please unlock your wallet again.');
      setSendStep('form');
      return;
    }

    setSendStep('sending');
    setSendError('');

    try {
      const result = await sendSPLToken(
        privateKey,
        recipientAddress.trim(),
        selectedNFT.mint,
        1, // NFT = 1 token
        0, // NFT = 0 decimals
        rpcEndpoint
      );

      if (result.success) {
        setTxSignature(result.signature);
        setSendStep('success');
        // Remove sent NFT from local list
        setNfts((prev) => prev.filter((n) => n.mint !== selectedNFT.mint));
      } else {
        setSendError(result.error || 'Failed to send NFT.');
        setSendStep('error');
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Transaction failed.');
      setSendStep('error');
    }
  };

  const handleSendDone = () => {
    setSendStep('idle');
    setSelectedNFT(null);
    setRecipientAddress('');
    setSendError('');
    setTxSignature('');
  };

  if (!wallet) return null;

  // ====== Send NFT Modal ======
  const renderSendFlow = () => {
    if (sendStep === 'idle') return null;

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center animate-fade-in">
        <div className="bg-[#0c1929] border-t border-[#1a3a5c] w-full max-w-lg rounded-t-2xl p-5 animate-slide-up">
          {/* Form */}
          {sendStep === 'form' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Send NFT</h3>
                <button onClick={handleCancelSend} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-[#1a2d4a] border border-[#2a4a6a]">
                <img src={selectedNFT?.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="text-sm text-white font-medium">{selectedNFT?.name}</p>
                  {selectedNFT?.collection && (
                    <p className="text-[10px] text-gray-500">{selectedNFT.collection}</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Enter Solana address"
                  className="w-full px-4 py-3 rounded-xl bg-[#1a2d4a] border border-[#2a4a6a] text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors font-mono"
                  spellCheck={false}
                />
              </div>

              {sendError && (
                <p className="text-xs text-red-400 mb-3 bg-red-900/20 p-2 rounded-lg">{sendError}</p>
              )}

              <button
                onClick={handleReviewSend}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all"
              >
                Review
              </button>
            </>
          )}

          {/* Confirm */}
          {sendStep === 'confirm' && (
            <>
              <h3 className="font-bold text-white mb-4">Confirm Send NFT</h3>

              <WarningBanner
                type="warning"
                title="Irreversible"
                message="NFT transfers on Solana cannot be undone. Please verify the recipient address."
              />

              <div className="mt-4 p-3 rounded-xl bg-[#1a2d4a] border border-[#2a4a6a] space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">NFT</span>
                  <span className="text-xs text-white font-medium">{selectedNFT?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">To</span>
                  <span className="text-xs text-white font-mono max-w-[180px] truncate">{recipientAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Network Fee</span>
                  <span className="text-xs text-gray-300">~0.005 SOL</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => setSendStep('form')}
                  className="py-3 rounded-xl text-sm font-medium bg-[#1a2d4a] border border-[#2a4a6a] text-white hover:bg-[#1e3555] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSend}
                  className="py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 text-white transition-all"
                >
                  Confirm Send
                </button>
              </div>
            </>
          )}

          {/* Sending */}
          {sendStep === 'sending' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 border-3 border-gray-700 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-sm text-gray-300">Sending NFT...</p>
              <p className="text-xs text-gray-500 mt-1">Please wait for confirmation</p>
            </div>
          )}

          {/* Success */}
          {sendStep === 'success' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-1">NFT Sent!</h3>
              <p className="text-xs text-gray-400 mb-4">{selectedNFT?.name} has been transferred.</p>

              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                View on Solscan →
              </a>

              <button
                onClick={handleSendDone}
                className="w-full mt-4 py-3 rounded-xl text-sm font-semibold bg-[#1a2d4a] border border-[#2a4a6a] text-white hover:bg-[#1e3555] transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {sendStep === 'error' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mb-1">Transfer Failed</h3>
              <p className="text-xs text-red-400 mb-4">{sendError}</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelSend}
                  className="py-3 rounded-xl text-sm font-medium bg-[#1a2d4a] border border-[#2a4a6a] text-white hover:bg-[#1e3555] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setSendStep('form')}
                  className="py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 text-white transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
        <h1 className="text-lg font-bold text-white">My NFTs</h1>
        <button
          onClick={fetchNFTs}
          disabled={isLoading}
          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading NFTs..." />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && nfts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="w-20 h-20 rounded-2xl bg-[#0c1929] border border-[#1a3a5c] flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">No NFTs found</p>
          <p className="text-gray-600 text-xs text-center mt-1 max-w-[250px]">
            NFTs in your wallet will appear here automatically
          </p>
        </div>
      )}

      {/* NFT Grid */}
      {!isLoading && nfts.length > 0 && !selectedNFT && (
        <div className="px-4 flex-1">
          <p className="text-xs text-gray-500 mb-3 px-1">{nfts.length} NFT{nfts.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 gap-3">
            {nfts.map((nft) => (
              <button
                key={nft.mint}
                onClick={() => setSelectedNFT(nft)}
                className="rounded-xl overflow-hidden bg-[#0c1929] border border-[#1a3a5c] hover:border-cyan-500/40 transition-all text-left"
              >
                <div className="aspect-square w-full bg-[#1a2a3a] relative overflow-hidden">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).className = 'hidden';
                    }}
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-white font-medium truncate">{nft.name}</p>
                  {nft.collection && (
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{nft.collection}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NFT Detail View */}
      {selectedNFT && (
        <div className="px-5 flex-1 animate-fade-in">
          {/* Back button */}
          <button
            onClick={() => { setSelectedNFT(null); setSendStep('idle'); }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to collection
          </button>

          {/* Image */}
          <div className="rounded-2xl overflow-hidden bg-[#0c1929] border border-[#1a3a5c] mb-4">
            <div className="aspect-square w-full bg-[#1a2a3a] relative">
              <img
                src={selectedNFT.image}
                alt={selectedNFT.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl bg-[#0c1929] border border-[#1a3a5c] p-4 mb-4">
            <h2 className="text-base font-bold text-white mb-1">{selectedNFT.name}</h2>
            {selectedNFT.collection && (
              <p className="text-xs text-cyan-400 mb-2">{selectedNFT.collection}</p>
            )}
            {selectedNFT.description && (
              <p className="text-xs text-gray-400 leading-relaxed">{selectedNFT.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* Send NFT Button */}
            <button
              onClick={handleStartSend}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Send NFT
            </button>

            <button
              onClick={() => handleCopyMint(selectedNFT.mint)}
              className="w-full py-3 rounded-xl bg-[#1a2d4a] border border-[#2a4a6a] text-sm text-white font-medium hover:bg-[#1e3555] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy NFT Address
            </button>

            <a
              href={`https://solscan.io/token/${selectedNFT.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-[#1a2d4a] border border-[#2a4a6a] text-sm text-white font-medium hover:bg-[#1e3555] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Solscan
            </a>
          </div>
        </div>
      )}

      {/* Send NFT Modal */}
      {renderSendFlow()}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
