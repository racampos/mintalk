import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

if (!HELIUS_RPC_URL) {
  throw new Error('HELIUS_RPC_URL environment variable is not set');
}

if (!HELIUS_API_KEY) {
  throw new Error('HELIUS_API_KEY environment variable is not set');
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Validate the wallet address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Create connection to Solana with API key
    const rpcUrlWithKey = `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`;
    const connection = new Connection(rpcUrlWithKey, 'confirmed');

    // Get SOL balance
    const balanceLamports = await connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

    // Format balance for display
    const formattedBalance = balanceSOL.toFixed(4);

    return NextResponse.json({
      address: walletAddress,
      balance_lamports: balanceLamports,
      balance_sol: balanceSOL,
      formatted_balance: `${formattedBalance} SOL`,
      is_zero: balanceLamports === 0,
      has_insufficient_funds: balanceLamports < 5000 // Less than ~0.000005 SOL (basic transaction fee)
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
