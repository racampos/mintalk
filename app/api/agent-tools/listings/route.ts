import { NextRequest, NextResponse } from "next/server";

// Magic Eden API base URL
const MAGIC_EDEN_API = "https://api-mainnet.magiceden.dev/v2";

export async function POST(req: NextRequest) {
  try {
    const { mint } = await req.json();
    
    if (!mint) {
      return NextResponse.json(
        { error: "Mint address is required" },
        { status: 400 }
      );
    }

    // Get listings for this token from Magic Eden
    const response = await fetch(
      `${MAGIC_EDEN_API}/tokens/${mint}/listings`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          listings: [],
          message: "No listings found for this NFT"
        });
      }
      throw new Error(`Magic Eden API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Normalize the listings data
    const listings = Array.isArray(data) ? data.map((listing: any) => ({
      id: listing.pdaAddress || listing.tokenAddress,
      price: listing.price,
      priceLamports: Math.floor(listing.price * 1_000_000_000), // Convert SOL to lamports
      seller: listing.seller,
      marketplace: "magic_eden",
      tokenMint: listing.tokenMint,
      tokenAddress: listing.tokenAddress,
      auctionHouse: listing.auctionHouse,
      expiry: listing.expiry,
    })) : [];

    return NextResponse.json({
      listings,
      count: listings.length,
      mint
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mint = searchParams.get("mint");
  
  if (!mint) {
    return NextResponse.json(
      { error: "Mint parameter is required" },
      { status: 400 }
    );
  }

  // Forward to POST method with mint in body
  return POST(new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ mint })
  }));
}
