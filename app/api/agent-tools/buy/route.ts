import { NextRequest, NextResponse } from "next/server";

// Magic Eden API base URL
const MAGIC_EDEN_API = "https://api-mainnet.magiceden.dev/v2";

export async function POST(req: NextRequest) {
  try {
    const { mint, listingId, price, buyer } = await req.json();
    
    if (!mint || !listingId || !buyer || price === undefined) {
      return NextResponse.json(
        { error: "mint, listingId, price, and buyer are required" },
        { status: 400 }
      );
    }

    console.log(`🛒 Preparing buy transaction:`);
    console.log(`  - NFT Mint: ${mint}`);
    console.log(`  - Listing ID: ${listingId}`);
    console.log(`  - Price: ${price} SOL`);
    console.log(`  - Buyer: ${buyer}`);

    // First, verify the token exists
    const tokenResponse = await fetch(
      `${MAGIC_EDEN_API}/tokens/${mint}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!tokenResponse.ok) {
      console.error(`Failed to verify token: ${tokenResponse.status}`);
      return NextResponse.json(
        { error: `Failed to verify token: ${tokenResponse.status}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log(`📋 Token verified:`, tokenData.name || 'Unknown NFT');

    // Try to get buy instruction from Magic Eden
    try {
      const buyResponse = await fetch(
        `${MAGIC_EDEN_API}/instructions/buy_now`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            buyer,
            auctionHouseAddress: "E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fJJ8BJ", // Magic Eden's auction house
            tokenMint: mint,
            tokenATA: listingId, // This might need to be calculated differently
            price: Math.floor(price * 1_000_000_000), // Convert SOL to lamports
            expiry: -1,
          }),
        }
      );

      if (buyResponse.ok) {
        const buyData = await buyResponse.json();
        console.log(`✅ Magic Eden buy instruction received`);
        
        if (buyData.tx || buyData.txBase64) {
          return NextResponse.json({
            txBase64: buyData.tx || buyData.txBase64,
            message: "Buy transaction prepared successfully",
            mint,
            listingId,
            price
          });
        }
      }
    } catch (buyError) {
      console.log(`⚠️ Magic Eden buy instruction failed, trying alternative approach:`, buyError);
    }

    // For now, return a more informative error with the correct data structure
    return NextResponse.json({
      error: "Magic Eden buy instruction API not responding correctly",
      details: {
        mint,
        listingId, 
        price,
        buyer,
        tokenName: tokenData.name || "Unknown NFT"
      },
      message: `Successfully identified NFT "${tokenData.name || 'Unknown'}" but Magic Eden transaction creation is still being implemented.`,
      nextSteps: "The wallet integration is working, we just need to complete the Magic Eden API integration."
    });
    
  } catch (error) {
    console.error("Error preparing buy transaction:", error);
    return NextResponse.json(
      { error: "Failed to prepare buy transaction" },
      { status: 500 }
    );
  }
}