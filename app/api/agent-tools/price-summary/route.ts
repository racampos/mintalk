import { NextRequest, NextResponse } from "next/server";
import listingCache from "@/app/lib/listing-cache";

// Smart price formatting: 3 decimals for prices < 1 SOL, 2 decimals for prices >= 1 SOL
const formatPrice = (price: number): string => {
  return price < 1 ? price.toFixed(3) : price.toFixed(2);
};

export async function POST(req: NextRequest) {
  try {
    const { mints } = await req.json();
    
    if (!mints || !Array.isArray(mints)) {
      return NextResponse.json(
        { error: "mints array is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Getting price summary for ${mints.length} NFTs using cache`);
    
    // Get cache hits and misses
    const { hits, misses } = listingCache.getMultiple(mints);
    console.log(`🎯 [PriceSummary] Cache performance: ${Object.keys(hits).length} hits, ${misses.length} misses`);
    
    // Process cached data directly
    const listings: any[] = [];
    
    // Handle cache hits - convert to expected format
    for (const [mint, cachedData] of Object.entries(hits)) {
      if (cachedData.listings && cachedData.listings.length > 0) {
        const listing = cachedData.listings[0];
        listings.push({
          mint,
          status: 'listed',
          price: listing.price,
          seller: listing.seller,
          listingId: listing.id
        });
      } else {
        listings.push({ mint, status: 'unlisted' });
      }
    }
    
    // Handle cache misses - make API calls only for missing data
    if (misses.length > 0) {
      console.log(`🌐 [PriceSummary] Fetching ${misses.length} missing entries from API`);
      
      const missPromises = misses.map(async (mint: string) => {
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
          console.error(`Error fetching missing data for ${mint}:`, error);
          return { 
            mint, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      // Wait for missing data with timeout
      const timeoutPromise = new Promise(resolve => 
        setTimeout(() => resolve([]), 8000) // 8 second timeout for misses only
      );

      const missResults = await Promise.race([
        Promise.allSettled(missPromises),
        timeoutPromise
      ]) as PromiseSettledResult<any>[];

      // Add miss results to listings
      const missData = missResults
        .filter(result => result && result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean);
      
      listings.push(...missData);
    }

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
        seller: l.seller?.substring(0, 8) + '...',  // Display version (truncated)
        sellerAddress: l.seller,  // Full address for transactions
        listingId: l.listingId
      }))
    };

    console.log(`📊 Price summary complete (${Object.keys(hits).length} from cache, ${misses.length} from API):`, summary);

    return NextResponse.json({
      success: true,
      summary,
      message: listedNFTs.length > 0 
        ? `Found ${listedNFTs.length} NFTs with active listings out of ${mints.length} checked. Prices range from ${summary.price_range?.min ? formatPrice(summary.price_range.min) : '0.00'} to ${summary.price_range?.max ? formatPrice(summary.price_range.max) : '0.00'} SOL.`
        : `Checked ${listings.length} NFTs - none currently have active listings on Magic Eden.`,
      timestamp: new Date().toISOString(),
      cachePerformance: {
        hits: Object.keys(hits).length,
        misses: misses.length,
        hitRate: `${Math.round((Object.keys(hits).length / mints.length) * 100)}%`
      }
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
