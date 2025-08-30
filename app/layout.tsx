import type { Metadata } from "next";
import "./globals.css";
import SolanaWalletProvider from "./providers/solana-wallet";

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
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
