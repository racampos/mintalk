import { NextRequest, NextResponse } from "next/server";

// Magic Eden API base URL
const MAGIC_EDEN_API = "https://api-mainnet.magiceden.dev/v2";

export async function POST(req: NextRequest) {
  try {
    const { mint, priceLamports, seller } = await req.json();
    
    if (!mint || !priceLamports || !seller) {
      return NextResponse.json(
        { error: "mint, priceLamports, and seller address are required" },
        { status: 400 }
      );
    }

    // Convert lamports to SOL for Magic Eden API
    const priceSOL = priceLamports / 1_000_000_000;

    // Get sell/list instruction from Magic Eden
    const response = await fetch(
      `${MAGIC_EDEN_API}/instructions/sell_now`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          seller,
          tokenMint: mint,
          price: priceSOL,
          auctionHouse: "E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fJJ8BJ", // Magic Eden's auction house
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Magic Eden sell instruction error:", errorText);
      
      // Try alternative endpoint structure
      const alternativeResponse = await fetch(
        `${MAGIC_EDEN_API}/instructions/sell`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            seller,
            tokenMint: mint,
            price: priceSOL,
          }),
        }
      );

      if (!alternativeResponse.ok) {
        return NextResponse.json(
          { error: `Failed to get sell instruction: ${response.status}` },
          { status: response.status }
        );
      }

      const altData = await alternativeResponse.json();
      return NextResponse.json({
        txBase64: altData.txBase64 || altData.tx,
        message: `Listing transaction prepared for ${priceSOL} SOL`,
        price: priceSOL,
        mint
      });
    }

    const data = await response.json();
    
    // The response should contain transaction data
    if (data.txBase64 || data.tx) {
      return NextResponse.json({
        txBase64: data.txBase64 || data.tx,
        message: `Listing transaction prepared for ${priceSOL} SOL`,
        price: priceSOL,
        mint
      });
    }

    // If the API returns instruction data instead of a full transaction
    if (data.instruction || data.instructions) {
      return NextResponse.json({
        instructions: data.instruction || data.instructions,
        message: `Listing instructions prepared for ${priceSOL} SOL`,
        price: priceSOL,
        mint,
        needsTransactionBuild: true
      });
    }

    return NextResponse.json({
      error: "Unexpected response format from Magic Eden API",
      data
    });
    
  } catch (error) {
    console.error("Error preparing sell transaction:", error);
    return NextResponse.json(
      { error: "Failed to prepare sell transaction" },
      { status: 500 }
    );
  }
}
