'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  show: boolean;
  onComplete?: () => void;
}

export default function Confetti({ show, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<Array<{
    id: number;
    color: string;
    left: number;
    animationDelay: number;
    size: number;
    shape: 'square' | 'circle' | 'triangle';
  }>>([]);

  useEffect(() => {
    if (show) {
      // Generate confetti pieces
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
          '#DDA0DD', '#98D8C8', '#F06292', '#AED581', '#FFB74D',
          '#FF8A65', '#A1C4FD', '#C2E9FB', '#FAD0C4', '#FFD1FF'
        ][Math.floor(Math.random() * 15)],
        left: Math.random() * 100,
        animationDelay: Math.random() * 3000,
        size: Math.random() * 8 + 6, // 6-14px
        shape: ['square', 'circle', 'triangle'][Math.floor(Math.random() * 3)] as 'square' | 'circle' | 'triangle'
      }));
      
      setPieces(newPieces);

      // Auto-complete after animation duration
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 10000); // 10 seconds total duration

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={`absolute animate-confetti-fall ${
            piece.shape === 'circle' ? 'rounded-full' : 
            piece.shape === 'triangle' ? 'triangle' : ''
          }`}
          style={{
            backgroundColor: piece.color,
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: `${piece.animationDelay}ms`,
            animationDuration: '3000ms',
            top: '-20px'
          }}
        />
      ))}
    </div>
  );
}
