import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { mint, name, collection } = await req.json();
    
    if (!mint || !name || !collection) {
      return NextResponse.json(
        { error: "mint, name, and collection are required" },
        { status: 400 }
      );
    }

    console.log(`🎯 [NFT Isolation] Isolating NFT for confirmation:`);
    console.log(`  - Mint: ${mint}`);
    console.log(`  - Name: ${name}`);
    console.log(`  - Collection: ${collection}`);

    // This is a UI state change command - the actual isolation happens in the frontend
    // We just return success and let the voice tutor handle the UI update
    return NextResponse.json({
      success: true,
      isolated_nft: {
        mint,
        name,
        collection
      },
      message: `Successfully isolated "${name}" from "${collection}" collection for purchase confirmation. This NFT is now displayed prominently on screen.`,
      action: "nft_isolated_for_confirmation"
    });

  } catch (error) {
    console.error("Error isolating NFT:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to isolate NFT",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
