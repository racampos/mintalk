'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3Auth } from "@web3auth/modal/react";
import { useSolanaWallet } from "@web3auth/modal/react/solana";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import Image from 'next/image';

interface EnhancedWalletDisplayProps {
  className?: string;
}

export default function EnhancedWalletDisplay({ className = '' }: EnhancedWalletDisplayProps) {
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { accounts, connection } = useSolanaWallet();
  const { web3Auth } = useWeb3Auth();
  
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch SOL balance
  const fetchBalance = useCallback(async () => {
    if (!isConnected || !accounts?.[0] || !connection) return;
    
    setLoadingBalance(true);
    try {
      const publicKey = new PublicKey(accounts[0]);
      const balance = await connection.getBalance(publicKey);
      setSolBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setSolBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, [isConnected, accounts, connection]);

  // Fetch user profile info - Web3Auth should provide this
  const fetchUserInfo = useCallback(async () => {
    if (!isConnected || !web3Auth) return;
    
    try {
      // Use the proper Web3Auth instance from the hook
      const user = await web3Auth.getUserInfo() as any;
      console.log('📋 Web3Auth User Info:', user);
      console.log('📋 TypeOfLogin:', user?.typeOfLogin);
      console.log('📋 Verifier:', user?.verifier);
      console.log('📋 AuthConnection:', user?.authConnection);
      setUserInfo(user);
    } catch (error) {
      console.log('Could not fetch user info, using fallback:', error);
      // Fallback user info - this should be rare now
      setUserInfo({
        typeOfLogin: 'social',
        name: 'Web3Auth User',
        email: null
      });
    }
  }, [isConnected, web3Auth]);

  useEffect(() => {
    if (isConnected) {
      fetchBalance();
      fetchUserInfo();
    } else {
      setSolBalance(null);
      setUserInfo(null);
    }
  }, [isConnected, fetchBalance, fetchUserInfo]);

  // Refresh balance periodically
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(fetchBalance, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isConnected, fetchBalance]);

  const handleClick = async () => {
    if (isConnected) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      await connect();
    }
  };

  const handleDisconnect = async () => {
    setIsDropdownOpen(false);
    await disconnect();
  };

  const loading = connectLoading || disconnectLoading;
  
  // Social provider favicon URLs and fallback emoji
  const getProviderIcon = (userInfo: any) => {
    const provider = userInfo?.typeOfLogin?.toLowerCase() || '';
    const verifier = userInfo?.verifier?.toLowerCase() || '';
    const authConnection = userInfo?.authConnection?.toLowerCase() || '';
    
    // Check typeOfLogin, verifier, and authConnection for Twitter/X variations
    if (provider.includes('twitter') || provider.includes('x-twitter') || provider === 'x' ||
        verifier.includes('twitter') || verifier.includes('x-twitter') || verifier === 'x' ||
        authConnection.includes('twitter') || authConnection.includes('x-twitter') || authConnection === 'x') {
      return {
        url: 'https://abs.twimg.com/favicons/twitter.3.ico',
        fallback: '🐦',
        alt: 'X (Twitter)'
      };
    }
    
    if (provider.includes('google') || verifier.includes('google') || authConnection.includes('google')) {
      return {
        url: 'https://www.google.com/favicon.ico',
        fallback: '🟢',
        alt: 'Google'
      };
    }
    
    if (provider.includes('discord') || verifier.includes('discord') || authConnection.includes('discord')) {
      return {
        url: 'https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico',
        fallback: '💬',
        alt: 'Discord'
      };
    }
    
    if (provider.includes('github') || verifier.includes('github') || authConnection.includes('github')) {
      return {
        url: 'https://github.com/favicon.ico',
        fallback: '🐙',
        alt: 'GitHub'
      };
    }
    
    if (provider.includes('facebook') || verifier.includes('facebook') || authConnection.includes('facebook')) {
      return {
        url: 'https://static.xx.fbcdn.net/rsrc.php/yo/r/iRmz9lCMBD2.ico',
        fallback: '📘',
        alt: 'Facebook'
      };
    }
    
    if (provider.includes('apple') || verifier.includes('apple') || authConnection.includes('apple')) {
      return {
        url: 'https://www.apple.com/favicon.ico',
        fallback: '🍎',
        alt: 'Apple'
      };
    }
    
    if (provider.includes('linkedin') || verifier.includes('linkedin') || authConnection.includes('linkedin')) {
      return {
        url: 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
        fallback: '💼',
        alt: 'LinkedIn'
      };
    }
    
    console.log('📋 Unknown provider for icon. TypeOfLogin:', provider, 'Verifier:', verifier, 'AuthConnection:', authConnection);
    return {
      url: null,
      fallback: '🔑',
      alt: 'Social Login'
    };
  };

  // Provider Icon Component with fallback
  const ProviderIcon = ({ iconData, size = 'w-5 h-5' }: { iconData: any, size?: string }) => {
    const [imageError, setImageError] = useState(false);
    
    if (imageError || !iconData.url) {
      return <span className="text-lg">{iconData.fallback}</span>;
    }
    
    return (
      <Image 
        src={iconData.url}
        alt={iconData.alt}
        width={20}
        height={20}
        className={`${size} rounded-sm`}
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
        unoptimized // External favicon URLs don't need Next.js optimization
      />
    );
  };

  const getSocialProviderName = (userInfo: any) => {
    const provider = userInfo?.typeOfLogin?.toLowerCase() || '';
    const verifier = userInfo?.verifier?.toLowerCase() || '';
    const authConnection = userInfo?.authConnection?.toLowerCase() || '';
    
    // Check typeOfLogin, verifier, and authConnection for Twitter/X variations
    if (provider.includes('twitter') || provider.includes('x-twitter') || provider === 'x' ||
        verifier.includes('twitter') || verifier.includes('x-twitter') || verifier === 'x' ||
        authConnection.includes('twitter') || authConnection.includes('x-twitter') || authConnection === 'x') {
      return 'X (Twitter)';
    }
    
    if (provider.includes('google') || verifier.includes('google') || authConnection.includes('google')) {
      return 'Google';
    }
    
    if (provider.includes('discord') || verifier.includes('discord') || authConnection.includes('discord')) {
      return 'Discord';
    }
    
    if (provider.includes('github') || verifier.includes('github') || authConnection.includes('github')) {
      return 'GitHub';
    }
    
    if (provider.includes('facebook') || verifier.includes('facebook') || authConnection.includes('facebook')) {
      return 'Facebook';
    }
    
    if (provider.includes('apple') || verifier.includes('apple') || authConnection.includes('apple')) {
      return 'Apple';
    }
    
    if (provider.includes('linkedin') || verifier.includes('linkedin') || authConnection.includes('linkedin')) {
      return 'LinkedIn';
    }
    
    console.log('📋 Unknown provider for name. TypeOfLogin:', provider, 'Verifier:', verifier, 'AuthConnection:', authConnection);
    return 'Social Login';
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`glass-card px-6 py-3 rounded-2xl text-white font-medium hover:scale-105 transition-all duration-300 bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-700/80 hover:to-blue-700/80 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-lg">🔑</span>
            <span>Login with Social</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        className="glass-card px-4 py-3 rounded-2xl text-white hover:scale-105 transition-all duration-300 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/30 hover:border-green-400/50"
      >
        <div className="flex items-center gap-3">
          {/* Social Provider Icon */}
          <div className="flex items-center gap-2">
            <ProviderIcon iconData={getProviderIcon(userInfo || {})} size="w-5 h-5" />
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Wallet Info */}
          <div className="flex flex-col items-start text-sm">
            <div className="font-medium">
              {accounts?.[0]?.slice(0, 4)}...{accounts?.[0]?.slice(-4)}
            </div>
            <div className="text-xs text-green-300">
              {loadingBalance ? (
                'Loading...'
              ) : solBalance !== null ? (
                `${solBalance.toFixed(4)} SOL`
              ) : (
                'Balance: --'
              )}
            </div>
          </div>
          
          {/* Dropdown Arrow */}
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 glass-card rounded-2xl border border-white/20 py-4 z-50">
          {/* User Profile Section */}
          <div className="px-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <ProviderIcon iconData={getProviderIcon(userInfo || {})} size="w-8 h-8" />
              <div>
                <div className="font-medium text-white">
                  {getSocialProviderName(userInfo || {})} Account
                </div>
                <div className="text-sm text-gray-300">
                  {userInfo?.name || userInfo?.email || 'Web3Auth User'}
                </div>
              </div>
            </div>
            
            {/* Wallet Address */}
            <div className="bg-black/20 rounded-lg p-3 font-mono text-xs">
              <div className="text-gray-400 mb-1">Wallet Address:</div>
              <div className="text-white break-all">{accounts?.[0]}</div>
            </div>
          </div>

          {/* Balance Section */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">SOL Balance:</span>
              <div className="flex items-center gap-2">
                {loadingBalance ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="text-white font-medium">
                    {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'Error loading'}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchBalance();
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-xs"
                >
                  ↻
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pt-4">
            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-400/50 rounded-lg text-white transition-colors duration-200"
            >
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        ></div>
      )}
    </div>
  );
}
