'use client';

import React from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';

interface VoiceHeroCircleProps {
  voiceState: VoiceState;
  className?: string;
}

export const VoiceHeroCircle: React.FC<VoiceHeroCircleProps> = ({ voiceState, className = '' }) => {
  const getStateConfig = (state: VoiceState) => {
    switch (state) {
      case 'listening':
        return {
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ),
          glowColor: 'from-blue-500/30 to-cyan-400/30',
          ringColor: 'from-blue-500 to-cyan-400',
          animation: 'animate-pulse-blue',
          description: 'Listening'
        };
      case 'thinking':
        return {
          icon: (
            <svg className="w-12 h-12 text-white animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          glowColor: 'from-amber-500/30 to-yellow-400/30',
          ringColor: 'from-amber-500 to-yellow-400',
          animation: 'animate-glow-amber',
          description: 'Thinking'
        };
      case 'speaking':
        return {
          icon: (
            <div className="flex items-center justify-center space-x-1">
              <div className="w-1 bg-white rounded-full animate-wave-1" style={{ height: '20px' }}></div>
              <div className="w-1 bg-white rounded-full animate-wave-2" style={{ height: '32px' }}></div>
              <div className="w-1 bg-white rounded-full animate-wave-3" style={{ height: '24px' }}></div>
              <div className="w-1 bg-white rounded-full animate-wave-4" style={{ height: '36px' }}></div>
              <div className="w-1 bg-white rounded-full animate-wave-5" style={{ height: '28px' }}></div>
            </div>
          ),
          glowColor: 'from-green-500/30 to-emerald-400/30',
          ringColor: 'from-green-500 to-emerald-400',
          animation: 'animate-glow-green',
          description: 'Speaking'
        };
      case 'processing':
        return {
          icon: (
            <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
          glowColor: 'from-orange-500/30 to-red-400/30',
          ringColor: 'from-orange-500 to-red-400',
          animation: 'animate-glow-orange',
          description: 'Processing'
        };
      case 'idle':
      default:
        return {
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
          glowColor: 'from-purple-500/30 to-blue-400/30',
          ringColor: 'from-purple-600 to-blue-600',
          animation: 'animate-glow',
          description: 'Ready'
        };
    }
  };

  const config = getStateConfig(voiceState);

  return (
    <div className={`inline-block mb-6 relative ${className}`}>
      {/* Outer Glow Ring - Only for active states */}
      {voiceState !== 'idle' && (
        <div 
          className={`absolute inset-0 p-4 glass-effect rounded-full bg-gradient-to-r ${config.glowColor} ${config.animation}`}
          style={{ 
            transform: 'scale(1.2)',
            filter: 'blur(8px)',
            opacity: 0.6
          }}
        />
      )}
      
      {/* Main Circle */}
      <div className={`p-4 glass-effect rounded-full ${config.animation} transition-all duration-500 ease-in-out`}>
        {config.icon}
      </div>
      
      {/* Additional animated elements for special states */}
      {voiceState === 'listening' && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-ping" />
          <div className="absolute inset-0 rounded-full border border-blue-300/20 animate-pulse" />
        </>
      )}
      
      {voiceState === 'speaking' && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-green-300/20" 
               style={{ animation: 'wave-ring 1s ease-in-out infinite' }} />
        </>
      )}
    </div>
  );
};
