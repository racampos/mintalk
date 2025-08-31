import type { Metadata } from "next";
import "./globals.css";
import "./polyfills";
import Web3AuthWalletProvider from "./providers/web3auth-provider";

export const metadata: Metadata = {
  title: "Solana NFT Search & Voice Tutor",
  description: "Search Solana NFTs using Helius DAS with AI voice assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Web3AuthWalletProvider>
          {children}
        </Web3AuthWalletProvider>
      </body>
    </html>
  );
}
