import { NextRequest, NextResponse } from "next/server";

// Magic Eden API base URL
const MAGIC_EDEN_API = "https://api-mainnet.magiceden.dev/v2";

export async function POST(req: NextRequest) {
  try {
    const { listingId, buyer } = await req.json();
    
    if (!listingId || !buyer) {
      return NextResponse.json(
        { error: "listingId and buyer address are required" },
        { status: 400 }
      );
    }

    // Get buy instruction from Magic Eden
    const response = await fetch(
      `${MAGIC_EDEN_API}/instructions/buy_now`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          buyer,
          seller: listingId, // This might need adjustment based on Magic Eden's actual API
          tokenMint: listingId,
          price: 0, // This would come from the listing
          auctionHouse: "E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fJJ8BJ", // Magic Eden's auction house
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Magic Eden buy instruction error:", errorText);
      return NextResponse.json(
        { error: `Failed to get buy instruction: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // The response should contain transaction data
    if (data.txBase64 || data.tx) {
      return NextResponse.json({
        txBase64: data.txBase64 || data.tx,
        message: "Buy transaction prepared successfully"
      });
    }

    // If the API returns instruction data instead of a full transaction
    if (data.instruction || data.instructions) {
      return NextResponse.json({
        instructions: data.instruction || data.instructions,
        message: "Buy instructions prepared successfully",
        needsTransactionBuild: true
      });
    }

    return NextResponse.json({
      error: "Unexpected response format from Magic Eden API",
      data
    });
    
  } catch (error) {
    console.error("Error preparing buy transaction:", error);
    return NextResponse.json(
      { error: "Failed to prepare buy transaction" },
      { status: 500 }
    );
  }
}
