import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solana NFT Search",
  description: "Search Solana NFTs using Helius DAS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
