"use client";

import React from 'react';
import { Web3AuthProvider } from "@web3auth/modal/react";
import { useSolanaWallet, useSignAndSendTransaction } from "@web3auth/modal/react/solana";
import { Connection, VersionedTransaction } from '@solana/web3.js';
import web3AuthContextConfig from '../lib/web3auth-config';

interface Web3AuthWalletProviderProps {
  children: React.ReactNode;
}

// Main provider component that replaces SolanaWalletProvider
export default function Web3AuthWalletProvider({ children }: Web3AuthWalletProviderProps) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      {children}
    </Web3AuthProvider>
  );
}

// Helper function to sign and send transactions - maintains same interface as original
export async function signAndSendTxWithWallet(
  txBase64: string,
  cluster: 'mainnet' | 'devnet' = 'mainnet',
  wallet?: any // For compatibility, but we'll use Web3Auth hooks inside components
): Promise<{ signature?: string; error?: string }> {
  try {
    // Decode the base64 transaction
    const txBuffer = Buffer.from(txBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Note: This function is kept for compatibility but in practice,
    // components should use useSignAndSendTransaction hook directly
    // This is a fallback implementation
    if (!wallet || !wallet.signAndSendTransaction) {
      return { error: 'Wallet not connected or does not support signing' };
    }

    const signature = await wallet.signAndSendTransaction(transaction);
    return { signature: signature.toString() };
  } catch (error) {
    console.error('Error signing transaction:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error signing transaction' 
    };
  }
}

// Helper function to get connection for the specified cluster - maintains same interface
export function getConnection(cluster: 'mainnet' | 'devnet' = 'mainnet'): Connection {
  const endpoint = cluster === 'mainnet' 
    ? `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    : 'https://api.devnet.solana.com';
  
  return new Connection(endpoint, 'confirmed');
}

// Custom hook to provide wallet functionality similar to useWallet from wallet adapter
export function useWeb3AuthWallet() {
  const { accounts, connection } = useSolanaWallet();
  const { signAndSendTransaction, data: transactionSignature, loading, error } = useSignAndSendTransaction();

  return {
    connected: accounts && accounts.length > 0,
    publicKey: accounts?.[0] ? { toString: () => accounts[0] } : null,
    signAndSendTransaction: signAndSendTransaction,
    connection,
    transactionSignature,
    loading,
    error
  };
}
