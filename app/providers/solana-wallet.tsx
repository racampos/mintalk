"use client";

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection, VersionedTransaction } from '@solana/web3.js';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

export default function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      // Add more wallet adapters as needed
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Helper function to sign and send transactions
export async function signAndSendTxWithWallet(
  txBase64: string,
  cluster: 'mainnet' | 'devnet' = 'mainnet',
  wallet?: any // Should be typed with proper wallet interface
): Promise<{ signature?: string; error?: string }> {
  try {
    if (!wallet || !wallet.signAndSendTransaction) {
      return { error: 'Wallet not connected or does not support signing' };
    }

    // Decode the base64 transaction
    const txBuffer = Buffer.from(txBase64, 'base64');
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Sign and send the transaction
    const signature = await wallet.signAndSendTransaction(transaction);

    return { signature: signature.toString() };
  } catch (error) {
    console.error('Error signing transaction:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error signing transaction' 
    };
  }
}

// Helper function to get connection for the specified cluster
export function getConnection(cluster: 'mainnet' | 'devnet' = 'mainnet'): Connection {
  const endpoint = cluster === 'mainnet' 
    ? clusterApiUrl(WalletAdapterNetwork.Mainnet)
    : clusterApiUrl(WalletAdapterNetwork.Devnet);
  
  return new Connection(endpoint, 'confirmed');
}
