import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { mints } = await req.json();
    
    if (!mints || !Array.isArray(mints)) {
      return NextResponse.json(
        { error: "mints array is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Getting price summary for ${mints.length} NFTs`);
    
    // Check listings for each NFT
    const listingPromises = mints.map(async (mint: string) => {
      try {
        const response = await fetch(`${req.nextUrl.origin}/api/agent-tools/listings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mint })
        });

        if (!response.ok) {
          return { mint, status: 'error', error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        
        if (data.listings && data.listings.length > 0) {
          const listing = data.listings[0];
          return {
            mint,
            status: 'listed',
            price: listing.price,
            seller: listing.seller,
            listingId: listing.id
          };
        } else {
          return { mint, status: 'unlisted' };
        }
      } catch (error) {
        console.error(`Error checking listing for ${mint}:`, error);
        return { 
          mint, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Wait for all listings to be checked (with a reasonable timeout)
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve([]), 10000) // 10 second timeout
    );

    const listingResults = await Promise.race([
      Promise.allSettled(listingPromises),
      timeoutPromise
    ]) as PromiseSettledResult<any>[];

    // Process results
    const listings = listingResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(Boolean);

    const listedNFTs = listings.filter(l => l.status === 'listed');
    const unlistedNFTs = listings.filter(l => l.status === 'unlisted');
    const errorNFTs = listings.filter(l => l.status === 'error');

    const summary = {
      total: mints.length,
      checked: listings.length,
      listed: listedNFTs.length,
      unlisted: unlistedNFTs.length,
      errors: errorNFTs.length,
      price_range: listedNFTs.length > 0 ? {
        min: Math.min(...listedNFTs.map(l => l.price)),
        max: Math.max(...listedNFTs.map(l => l.price)),
        average: listedNFTs.reduce((sum, l) => sum + l.price, 0) / listedNFTs.length
      } : null,
      listings: listedNFTs.map(l => ({
        mint: l.mint,
        price: l.price,
        seller: l.seller?.substring(0, 8) + '...',
        listingId: l.listingId
      }))
    };

    console.log(`📊 Price summary complete:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      message: listedNFTs.length > 0 
        ? `Found ${listedNFTs.length} NFTs with active listings out of ${mints.length} checked. Prices range from ${summary.price_range?.min.toFixed(2)} to ${summary.price_range?.max.toFixed(2)} SOL.`
        : `Checked ${listings.length} NFTs - none currently have active listings on Magic Eden.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error generating price summary:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to generate price summary",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
