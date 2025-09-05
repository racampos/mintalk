"use client";
import { useState, useEffect } from 'react';

interface IOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function IOSToggle({ 
  checked, 
  onChange, 
  disabled = false, 
  size = 'sm' 
}: IOSToggleProps) {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6', 
    lg: 'w-14 h-8'
  };
  
  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const translateClasses = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-6' : 'translate-x-0.5', 
    lg: checked ? 'translate-x-8' : 'translate-x-1'
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        ${sizeClasses[size]}
        relative inline-flex items-center rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
        ${checked ? 'bg-cyan-500' : 'bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}
      `}
    >
      <span
        className={`
          ${thumbSizeClasses[size]}
          bg-white rounded-full shadow-lg transform transition-transform duration-200 ease-in-out
          ${translateClasses[size]}
        `}
      />
      <span className="sr-only">Toggle switch</span>
    </button>
  );
}
