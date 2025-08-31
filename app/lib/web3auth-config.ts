import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";

// Get Web3Auth Client ID from environment variables
const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

if (!clientId) {
  throw new Error("NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is required");
}

// Web3Auth configuration for Solana devnet (matching project network)
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    chainConfig: {
      chainNamespace: "solana",
      chainId: "0x2", // Solana devnet
      rpcTarget: "https://api.devnet.solana.com",
    }
  }
};

export default web3AuthContextConfig;
