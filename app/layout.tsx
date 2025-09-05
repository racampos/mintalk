import type { Metadata } from "next";
import "./globals.css";
import "./polyfills";
import Web3AuthWalletProvider from "./providers/web3auth-provider";

export const metadata: Metadata = {
  title: "Mintalk - AI-Powered NFT Discovery",
  description: "Mintalk: Discover and trade Solana NFTs with AI voice assistance powered by MetaMask Embedded Wallets SDK",
  icons: {
    icon: '/favicon.png',
  },
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
