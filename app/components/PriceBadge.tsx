"use client";

import { useEffect, useState } from 'react';
import listingQueue from '../services/listingQueue';

export type ListingStatus = 'loading' | 'listed' | 'unlisted' | 'error';

export interface ListingData {
  status: ListingStatus;
  price?: number; // Price in SOL
  priceLamports?: number; // Price in lamports
  seller?: string;
  listingId?: string;
  error?: string;
}

interface PriceBadgeProps {
  mint: string;
  onListingData?: (mint: string, data: ListingData) => void;
  className?: string;
}

export default function PriceBadge({ mint, onListingData, className = "" }: PriceBadgeProps) {
  const [listing, setListing] = useState<ListingData>({ status: 'loading' });

  useEffect(() => {
    let isCancelled = false;
    
    const checkListing = async () => {
      console.log(`🎯 [PriceBadge] Starting check for mint ${mint.substring(0, 8)}...`);
      
      try {
        const data = await listingQueue.checkListing(mint);
        console.log(`📋 [PriceBadge] Received data for mint ${mint.substring(0, 8)}...:`, data);

        if (isCancelled) return;
        
        if (data.listings && data.listings.length > 0) {
          const firstListing = data.listings[0];
          console.log(`💎 [PriceBadge] Setting LISTED for mint ${mint.substring(0, 8)}... with price ${firstListing.price} SOL`);
          
          const listingData: ListingData = {
            status: 'listed',
            price: firstListing.price,
            priceLamports: firstListing.priceLamports,
            seller: firstListing.seller,
            listingId: firstListing.id
          };
          setListing(listingData);
          onListingData?.(mint, listingData);
        } else {
          console.log(`📭 [PriceBadge] Setting UNLISTED for mint ${mint.substring(0, 8)}... (${data.listings?.length || 0} listings)`);
          
          const listingData: ListingData = { status: 'unlisted' };
          setListing(listingData);
          onListingData?.(mint, listingData);
        }
      } catch (error) {
        if (isCancelled) return;
        
        const errorMsg = error instanceof Error ? error.message : 'Failed to check listing';
        console.error(`💥 [PriceBadge] Setting ERROR for mint ${mint.substring(0, 8)}...:`, {
          error: errorMsg,
          errorType: typeof error,
          isAbortError: errorMsg.includes('aborted'),
          isTimeoutError: errorMsg.includes('timeout')
        });
        
        const errorData: ListingData = { 
          status: 'error', 
          error: errorMsg
        };
        setListing(errorData);
        onListingData?.(mint, errorData);
      }
    };

    // Add a small delay to prevent immediate API spam (reduced for faster loading)
    const timer = setTimeout(checkListing, Math.random() * 1000 + 200); // 200ms-1.2s random delay

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [mint, onListingData]);

  const getBadgeContent = () => {
    switch (listing.status) {
      case 'loading':
        return {
          content: '⏳ Checking...',
          className: 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white animate-pulse'
        };
      case 'listed':
        return {
          content: `💎 ${listing.price?.toFixed(2)} SOL`,
          className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
        };
      case 'unlisted':
        return {
          content: '📅 Not Listed',
          className: 'bg-gradient-to-r from-gray-500/80 to-gray-600/80 text-white/90'
        };
      case 'error':
        return {
          content: '❌ Error',
          className: 'bg-gradient-to-r from-red-500/80 to-red-600/80 text-white/90'
        };
    }
  };

  const { content, className: badgeClassName } = getBadgeContent();

  return (
    <div className={`absolute top-4 left-4 z-10 ${className}`}>
      <div className="relative">
        {/* Glow effect for listed items */}
        {listing.status === 'listed' && (
          <div className="absolute inset-0 bg-green-500 blur rounded-full animate-pulse"></div>
        )}
        <span className={`relative px-3 py-1.5 text-xs font-bold rounded-full border border-white/20 backdrop-blur-sm transition-all duration-300 ${badgeClassName}`}>
          {content}
        </span>
      </div>
    </div>
  );
}
