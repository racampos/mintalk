import { NextRequest, NextResponse } from "next/server";
import listingCache from "@/app/lib/listing-cache";

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

    console.log(`🔍 [ListingsAPI] Looking up listings for mint: ${mint.substring(0, 8)}...`);
    
    // Check cache first
    const cachedData = listingCache.get(mint);
    if (cachedData) {
      console.log(`⚡ [ListingsAPI] Returning cached data for mint: ${mint.substring(0, 8)}...`);
      return NextResponse.json(cachedData);
    }

    console.log(`🌐 [ListingsAPI] Cache miss - fetching from Magic Eden API for mint: ${mint.substring(0, 8)}...`);
    
    // Get listings for this token from Magic Eden with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(
      `${MAGIC_EDEN_API}/tokens/${mint}/listings`,
      {
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ [ListingsAPI] Magic Eden API returned ${response.status} for mint ${mint.substring(0, 8)}...`);
      
      if (response.status === 404) {
        console.log(`📭 [ListingsAPI] No listings found for mint ${mint.substring(0, 8)}...`);
        return NextResponse.json({
          listings: [],
          message: "No listings found for this NFT"
        });
      }
      if (response.status === 400) {
        console.error(`❌ [ListingsAPI] Invalid mint address: ${mint.substring(0, 8)}...`);
        return NextResponse.json({
          listings: [],
          error: `Invalid mint address: "${mint}". Please use the full Solana mint address (base58 string), not the NFT name or display ID.`,
          message: "Invalid mint address format"
        });
      }
      throw new Error(`Magic Eden API error: ${response.status} ${response.statusText}`);
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

    console.log(`✅ [ListingsAPI] Successfully fetched ${listings.length} listings for mint ${mint.substring(0, 8)}...`);
    
    // Prepare response data
    const responseData = {
      listings,
      count: listings.length,
      mint
    };

    // Store in cache for future use
    listingCache.set(mint, responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`💥 [ListingsAPI] Error fetching listings:`, {
      error: errorMsg,
      isTimeout: errorMsg.includes('aborted') || errorMsg.includes('timeout'),
      isNetworkError: errorMsg.includes('fetch') || errorMsg.includes('network')
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch listings",
        details: errorMsg.includes('aborted') ? 'Request timeout' : errorMsg 
      },
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
