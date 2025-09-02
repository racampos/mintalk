"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import VoiceTutor from "./components/realtime/VoiceTutor";
import { VoiceHeroCircle, VoiceState } from "./components/realtime/VoiceHeroCircle";
import { useWeb3AuthConnect, useWeb3AuthDisconnect } from "@web3auth/modal/react";
import { useSolanaWallet } from "@web3auth/modal/react/solana";
import PriceBadge, { ListingData } from "./components/PriceBadge";
import listingQueue from "./services/listingQueue";
import Confetti from "./components/ui/Confetti";
import EnhancedWalletDisplay from "./components/auth/EnhancedWalletDisplay";

type UiAsset = {
  id: string;
  name: string;
  image: string | null;
  description: string;
  collection: string | null;
  compressed: boolean;
  external_url: string | null;
};



export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UiAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceAction, setVoiceAction] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  // Track listing data for each NFT by mint address
  const [listingsData, setListingsData] = useState<Record<string, ListingData>>({});

  const { isConnected } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();
  const { accounts } = useSolanaWallet();

  // Handle connection status updates from VoiceTutor
  const handleConnectionStatusChange = useCallback((status: 'connecting' | 'connected' | 'disconnected') => {
    console.log(`🔄 Parent received status change: ${status}`);
    setConnectionStatus(status);
    if (status === 'disconnected') {
      setVoiceSessionActive(false);
      console.log(`🎭 Voice State: idle (session disconnected)`);
      setVoiceState('idle');
      setVoiceAction('');
    } else if (status === 'connecting') {
      console.log(`🎭 Voice State: thinking (connecting to voice service)`);
      setVoiceState('thinking');
      setVoiceAction('Connecting to voice service...');
    } else if (status === 'connected') {
      console.log(`🎭 Voice State: listening (voice session ready)`);
      setVoiceState('listening');
      setVoiceAction('');
    }
  }, []);

  // Handle search results from voice tutor
  const handleVoiceSearchResults = useCallback((results: { items: UiAsset[], query: string, searchNote?: string }) => {
    console.log(`🎙️ Voice search results received:`, { count: results.items.length, query: results.query });
    setItems(results.items);
    setQ(results.query); // Update search box to show what was searched
    setError(results.searchNote || null);
    setLoading(false);
    // Clear previous listing data and queue cache when new search results arrive
    setListingsData({});
    listingQueue.clearCache();
  }, []);

  // Handle listing data updates from PriceBadges
  const handleListingData = useCallback((mint: string, data: ListingData) => {
    setListingsData(prev => ({ ...prev, [mint]: data }));
  }, []);

  // Handle confetti celebration trigger
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
  }, []);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
    // Keep transaction signature visible after confetti ends
  }, []);

  const handleTransactionComplete = useCallback((signature: string) => {
    setTransactionSignature(signature);
    // Clear any previous action text when showing transaction link
    setTimeout(() => {
      setVoiceAction('');
    }, 1000); // Give a moment for action text to be seen, then show link
  }, []);

  // Clear transaction signature when new actions begin
  const handleActionChange = useCallback((action: string) => {
    setVoiceAction(action);
    // Clear transaction signature when new action starts so action text can display
    if (action) {
      console.log('🔄 New action detected, clearing transaction signature:', action);
      setTransactionSignature(null);
    }
  }, []); // No dependencies to avoid stale closures

  // Handle voice session button click
  const handleVoiceSessionToggle = useCallback(() => {
    console.log(`🔘 Button clicked - current connectionStatus: ${connectionStatus}`);
    if (connectionStatus === 'connecting') {
      console.log(`🔘 Ignoring click - connection in progress`);
      return;
    }
    
    if (connectionStatus === 'connected') {
      console.log(`🔘 Ending voice session`);
      setVoiceSessionActive(false);
      // Clear transaction signature when ending session
      setTransactionSignature(null);
    } else {
      console.log(`🔘 Starting voice session`);
      setVoiceSessionActive(true);
      // Clear any previous transaction signature when starting new session
      setTransactionSignature(null);
    }
  }, [connectionStatus]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    // Clear previous listing data and queue cache when new search is performed
    setListingsData({});
    listingQueue.clearCache();
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=60`
      );
      const json = await res.json();
      setItems(json.items ?? []);
      
      // Show helpful message for missing specific NFTs
      if (json.searchNote) {
        setError(json.searchNote);
      }
    } catch (err: any) {
      setError(err?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // optional: default query
    // setQ('fox'); runSearch();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          {/* Top Bar with Wallet and Voice Tutor */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <EnhancedWalletDisplay />
            </div>
            <button
              onClick={handleVoiceSessionToggle}
              disabled={connectionStatus === 'connecting'}
              className={`flex items-center gap-3 px-6 py-3 glass-card rounded-2xl text-white transition-all duration-300 hover:scale-105 group ${
                connectionStatus === 'connected'
                  ? 'bg-red-500/20 hover:bg-red-500/30 border-red-400/30' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500/20 border-yellow-400/30 cursor-wait'
                  : 'hover:bg-white/10'
              }`}
            >
              <div className="relative">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {/* Only show dot when connecting or connected */}
                {connectionStatus !== 'disconnected' && (
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                    connectionStatus === 'connected' 
                      ? 'bg-green-400' 
                      : 'bg-yellow-400'
                  }`} />
                )}
              </div>
              <span className="font-medium">
                {connectionStatus === 'connected' 
                  ? 'End Voice Session' 
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Start Voice Session'}
              </span>
              {connectionStatus === 'disconnected' && (
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {/* Dynamic Hero Circle - shows voice states */}
          <VoiceHeroCircle voiceState={voiceState} actionText={voiceAction} transactionSignature={transactionSignature} />
          <h1 className="text-6xl font-bold mb-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Solana NFT
            </span>
            <br />
            <span className="text-white drop-shadow-2xl">Discovery</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            🚀 Explore the universe of Solana NFTs with lightning-fast search powered by Helius DAS
          </p>
          
          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
            <span className="px-4 py-2 glass-light text-white text-sm rounded-full backdrop-blur-md border border-white/20">⚡ Lightning Fast</span>
            <span className="px-4 py-2 glass-light text-white text-sm rounded-full backdrop-blur-md border border-white/20">🎨 Beautiful UI</span>
            <span className="px-4 py-2 glass-light text-white text-sm rounded-full backdrop-blur-md border border-white/20">🔍 Smart Search</span>
            <span className="px-4 py-2 glass-light text-white text-sm rounded-full backdrop-blur-md border border-white/20">🎤 Voice AI</span>
          </div>
        </div>

        {/* Futuristic Search Form */}
        <form onSubmit={runSearch} className="mb-16 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
          <div className="max-w-3xl mx-auto">
            <div className="relative group">
              {/* Glowing border animation */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl blur-sm opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-glow"></div>
              
              {/* Glass search container */}
              <div className="relative glass-card rounded-3xl p-3 backdrop-blur-xl border border-white/20">
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <div className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10">
                      <svg className="text-white/60 flex-shrink-0 group-hover:text-white transition-colors" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="🎨 Search the Solana NFT universe..."
                      className="w-full pl-16 pr-6 py-6 text-xl bg-transparent border-0 outline-none placeholder-white/60 text-white font-medium"
                    />
                    
                    {/* Animated input border */}
                    <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 transform scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                  </div>
                  
                  <button
                    className={`relative px-8 py-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                      loading 
                        ? "bg-gray-600 cursor-not-allowed text-gray-300" 
                        : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-2xl hover:shadow-cyan-500/25 transform hover:scale-105 active:scale-95"
                    }`}
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin flex-shrink-0" width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>🚀</span>
                        <span>Explore</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Enhanced search suggestions */}
            <div className="mt-8 text-center">
              <p className="text-white/60 mb-4">✨ Popular searches:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {['fox', 'ape', 'mad', 'bear', 'solana', 'art'].map((term, index) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQ(term);
                      const fakeEvent = { preventDefault: () => {} };
                      runSearch(fakeEvent as any);
                    }}
                    className="px-4 py-2 glass-light text-white/80 hover:text-white text-sm rounded-full backdrop-blur-md hover:bg-white/10 transition-all duration-200 animate-fade-in-up border border-white/20"
                    style={{animationDelay: `${1 + index * 0.1}s`}}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-12 animate-fade-in-up">
            <div className="glass-card border border-red-500/30 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <svg className="text-red-400 flex-shrink-0" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-red-300 mb-2 text-lg">🚫 Search Error</h3>
                  <p className="text-red-200/80">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Futuristic NFT Grid */}
        <div 
          className="grid gap-8" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            maxWidth: '1200px',
            margin: '0 auto',
            gap: '2rem' 
          }}
        >
          {items.map((a, index) => (
            <div
              key={a.id}
              className="group relative glass-card rounded-3xl overflow-hidden backdrop-blur-xl border border-white/20 hover:border-cyan-400/50 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 animate-fade-in-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              {/* Animated glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500"></div>
              
              {/* Holographic border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Image container */}
              <div className="relative overflow-hidden">
                <div className="w-full h-72 bg-gradient-to-br from-gray-800/50 to-gray-900/50 relative">
                  {a.image ? (
                    <Image
                      src={a.image}
                      alt={a.name}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                      <div className="p-4 rounded-full bg-white/10 mb-4">
                        <svg className="flex-shrink-0" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">🎭 No Preview</span>
                    </div>
                  )}
                  
                  {/* Holographic overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  
                  {/* Price Badge */}
                  <PriceBadge 
                    mint={a.id} 
                    onListingData={handleListingData}
                  />

                  {/* Advanced cNFT badge */}
                  {a.compressed && (
                    <div className="absolute top-4 right-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 blur rounded-full animate-pulse"></div>
                        <span className="relative px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-full shadow-2xl border border-cyan-400/50 backdrop-blur-sm">
                          ⚡ Compressed
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Futuristic content */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-cyan-400 transition-colors duration-300" title={a.name}>
                    {a.name || "🎨 Untitled NFT"}
                  </h3>
                  
                  {a.collection && (
                    <div className="flex items-center gap-2 text-white/70 hover:text-white/90 transition-colors">
                      <div className="p-1 bg-white/10 rounded-full">
                        <svg className="flex-shrink-0" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <span className="text-sm truncate">{a.collection}</span>
                    </div>
                  )}
                  
                  {a.description && (
                    <p className="text-sm text-white/60 line-clamp-2 leading-relaxed" title={a.description}>
                      {a.description}
                    </p>
                  )}
                </div>
                
                {/* Futuristic action button */}
                <div className="pt-4 border-t border-white/10">
                  <a
                    href={a.external_url ?? `https://explorer.solana.com/address/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group/btn relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    <span>🚀 Explore NFT</span>
                    <svg className="flex-shrink-0 transition-transform duration-300 group-hover/btn:translate-x-1" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && items.length === 0 && q && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="max-w-lg mx-auto">
              {/* Futuristic empty state icon */}
              <div className="relative mx-auto mb-8">
                <div className="w-32 h-32 mx-auto glass-light rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 animate-float">
                  <svg className="text-white/40 flex-shrink-0" width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {/* Orbiting dots */}
                <div className="absolute inset-0 animate-spin" style={{animationDuration: '20s'}}>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full"></div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-pink-400 rounded-full"></div>
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-white mb-4">
                🌌 No NFTs Discovered
              </h3>
              <p className="text-white/70 mb-8 text-lg leading-relaxed">
                The cosmic search for &ldquo;<span className="font-bold text-cyan-400">{q}</span>&rdquo; yielded no results in the Solana universe
              </p>
              
              {/* Enhanced suggestion pills */}
              <div className="space-y-4">
                <p className="text-white/60">🚀 Explore these popular galaxies:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {['fox', 'ape', 'mad', 'bear', 'art', 'solana'].map((term, index) => (
                    <button
                      key={term}
                      onClick={() => {
                        setQ(term);
                        const fakeEvent = { preventDefault: () => {} };
                        runSearch(fakeEvent as any);
                      }}
                      className="group px-5 py-3 glass-light text-white/80 hover:text-white border border-white/20 hover:border-cyan-400/50 rounded-full backdrop-blur-md hover:bg-white/10 transition-all duration-300 hover:scale-105 animate-fade-in-up"
                      style={{animationDelay: `${index * 0.1}s`}}
                    >
                      <span className="font-medium">{term}</span>
                      <span className="ml-2 opacity-50 group-hover:opacity-100 transition-opacity">✨</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Futuristic Footer */}
        <footer className="mt-24 pb-12 text-center animate-fade-in-up" style={{animationDelay: '1.2s'}}>
          <div className="glass-light rounded-2xl p-8 backdrop-blur-xl border border-white/20 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold">Solana NFT Discovery</h4>
                  <p className="text-white/60 text-sm">Powered by Helius DAS</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Live on Mainnet</span>
                </div>
                <div className="text-sm">
                  ⚡ Fast • 🔍 Smart • 🎨 Beautiful
                </div>
              </div>
            </div>
            
            {/* Gradient divider */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/40 text-sm">
                Built with ❤️ for the Solana ecosystem • Discover • Collect • Enjoy
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Background Voice Service */}
      {voiceSessionActive && (
        <VoiceTutor 
          isActive={voiceSessionActive} 
          onSessionEnd={() => setVoiceSessionActive(false)}
          onConnectionStatusChange={handleConnectionStatusChange}
          onSearchResults={handleVoiceSearchResults}
          onVoiceStateChange={setVoiceState}
          onActionChange={handleActionChange}
          onConfettiTrigger={triggerConfetti}
          onTransactionComplete={handleTransactionComplete}
          listingsData={listingsData}
          walletConnected={isConnected}
          walletAccounts={accounts || undefined}
        />
      )}

      {/* Confetti celebration */}
      <Confetti show={showConfetti} onComplete={handleConfettiComplete} />
    </main>
  );
}
