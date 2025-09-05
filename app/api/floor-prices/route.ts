import { NextRequest, NextResponse } from 'next/server';

const MAGIC_EDEN_BASE_URL = 'https://api-mainnet.magiceden.dev/v2';

// Mapping of our curated collection names to Magic Eden symbols
const COLLECTION_SYMBOLS: Record<string, string> = {
  "Mad Lads": "mad_lads",
  "Famous Fox Federation": "famous_fox_federation", 
  "Goatys": "goatys",
  "Okay Bears": "okay_bears",
  "Degenerate Ape Academy": "degenerate_ape_academy",
  "Solana Business Frogs": "solana_business_frogs",
  "Degen Monkes": "degen_monke", // Correct: singular form
  "The Goat Club": "the_goat_club_nft", // Correct: includes '_nft' suffix
  "DeGods": "degods",
  "Claynosaurz": "claynosaurz",
  "Frogana": "froganas", // Correct: plural form 'froganas'
  "Retardio Cousins": "retardio_cousins",
  "Little Swag World": "littleswagworld" // Correct: no underscores
};

interface CollectionStats {
  floorPrice?: number;
  listedCount?: number;
  volumeAll?: number;
}

interface FloorPriceResult {
  name: string;
  symbol: string;
  floorPrice: number | null;
  floorPriceSOL: number | null;
  listedCount: number | null;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const collections = url.searchParams.get('collections');
    
    // If specific collections requested, filter to those
    const requestedCollections = collections 
      ? collections.split(',').map(c => c.trim())
      : Object.keys(COLLECTION_SYMBOLS);

    console.log(`📊 Fetching floor prices for ${requestedCollections.length} collections`);

    // Fetch floor prices for all requested collections
    const floorPricePromises = requestedCollections.map(async (collectionName): Promise<FloorPriceResult> => {
      const symbol = COLLECTION_SYMBOLS[collectionName];
      
      if (!symbol) {
        return {
          name: collectionName,
          symbol: 'unknown',
          floorPrice: null,
          floorPriceSOL: null,
          listedCount: null,
          error: 'Collection symbol not found'
        };
      }

      try {
        const response = await fetch(`${MAGIC_EDEN_BASE_URL}/collections/${symbol}/stats`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const stats: CollectionStats = await response.json();
        
        return {
          name: collectionName,
          symbol,
          floorPrice: stats.floorPrice || null,
          floorPriceSOL: stats.floorPrice ? stats.floorPrice / 1000000000 : null, // Convert lamports to SOL
          listedCount: stats.listedCount || null,
          error: undefined
        };
      } catch (error) {
        console.error(`❌ Error fetching floor price for ${collectionName} (${symbol}):`, error);
        return {
          name: collectionName,
          symbol,
          floorPrice: null,
          floorPriceSOL: null,
          listedCount: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.all(floorPricePromises);
    
    // Separate successful results from errors
    const successful = results.filter(r => !r.error && r.floorPriceSOL !== null);
    const errors = results.filter(r => r.error || r.floorPriceSOL === null);

    console.log(`✅ Successfully fetched ${successful.length} floor prices, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        successful: successful.length,
        errors: errors.length,
        averageFloorSOL: successful.length > 0 
          ? successful.reduce((sum, r) => sum + (r.floorPriceSOL || 0), 0) / successful.length 
          : null,
        lowestFloor: successful.length > 0 
          ? Math.min(...successful.map(r => r.floorPriceSOL || Infinity))
          : null,
        highestFloor: successful.length > 0 
          ? Math.max(...successful.map(r => r.floorPriceSOL || -Infinity))
          : null
      }
    });

  } catch (error) {
    console.error('❌ Error in floor prices API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch floor prices', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
