'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface MyNFT {
  id: string;
  name: string;
  description: string;
  image: string | null;
  collection: string | null;
  mint_address: string;
  compressed: boolean;
  external_url: string | null;
  royalty: number;
  creators: any[];
  owner: string;
}

interface MyNFTsProps {
  walletAddress?: string;
  isConnected: boolean;
  className?: string;
}

export default function MyNFTs({ walletAddress, isConnected, className = '' }: MyNFTsProps) {
  const [nfts, setNfts] = useState<MyNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnedNFTs = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      setNfts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/owned-nfts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerAddress: walletAddress
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setNfts(data.nfts || []);
        console.log(`✅ Fetched ${data.nfts?.length || 0} owned NFTs`);
      } else {
        setError(data.error || 'Failed to fetch owned NFTs');
        console.error('❌ Error fetching owned NFTs:', data.error);
      }
    } catch (err) {
      setError('Network error while fetching NFTs');
      console.error('❌ Network error:', err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, walletAddress]);

  useEffect(() => {
    fetchOwnedNFTs();
  }, [fetchOwnedNFTs]);

  if (!isConnected) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Sign in with your social account to view and manage your NFT collection</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-flex items-center gap-3 text-cyan-400">
          <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <span className="text-lg">Loading your NFT collection...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading NFTs</h3>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchOwnedNFTs}
          className="px-6 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-400/50 rounded-lg text-white transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No NFTs Found</h3>
        <p className="text-gray-400 mb-4">You don't own any NFTs yet. Start exploring and collecting!</p>
        <button
          onClick={fetchOwnedNFTs}
          className="px-6 py-2 glass-card hover:bg-white/10 rounded-lg text-cyan-400 transition-colors duration-200"
        >
          Refresh Collection
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">My NFT Collection</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{nfts.length} NFTs</span>
          <button
            onClick={fetchOwnedNFTs}
            disabled={loading}
            className="px-4 py-2 glass-card hover:bg-white/10 rounded-lg text-cyan-400 transition-colors duration-200 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nfts.map((nft) => (
          <div key={nft.id} className="glass-card rounded-2xl overflow-hidden hover:scale-105 transition-all duration-300 group">
            {/* NFT Image */}
            <div className="aspect-square bg-gray-800 relative overflow-hidden">
              {nft.image ? (
                <Image
                  src={nft.image}
                  alt={nft.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Compressed badge */}
              {nft.compressed && (
                <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded-full">
                  Compressed
                </div>
              )}
            </div>

            {/* NFT Info */}
            <div className="p-4">
              <h3 className="font-semibold text-white text-lg line-clamp-2 mb-2">
                {nft.name}
              </h3>
              
              {nft.collection && (
                <p className="text-sm text-gray-400 mb-2">
                  {nft.collection}
                </p>
              )}

              <div className="flex items-center justify-between mt-4">
                <button className="px-4 py-2 bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-700/80 hover:to-blue-700/80 rounded-lg text-white text-sm font-medium transition-colors duration-200">
                  List for Sale
                </button>
                <button className="p-2 text-gray-400 hover:text-white transition-colors duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
