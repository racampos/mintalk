import { NextRequest, NextResponse } from "next/server";

const HELIUS_API_URL = "https://mainnet.helius-rpc.com";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!HELIUS_API_KEY) {
      console.error("❌ HELIUS_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "Helius API key not configured" },
        { status: 500 }
      );
    }

    const { ownerAddress } = await req.json();
    
    if (!ownerAddress) {
      return NextResponse.json(
        { error: "Owner address is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching owned NFTs for address: ${ownerAddress}`);

    // Use Helius DAS API to get NFTs owned by the user
    const requestBody = {
      jsonrpc: "2.0",
      id: "owned-nfts-request",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: ownerAddress,
        page: 1,
        limit: 50,
        displayOptions: {
          showCollectionMetadata: true,
          showGrandTotal: true,
          showNativeBalance: false,
        },
        sortBy: {
          sortBy: "recent_action",
          sortDirection: "desc"
        }
      }
    };

    console.log(`📤 Sending request to Helius DAS API:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${HELIUS_API_URL}/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log(`📥 Helius DAS API response status: ${response.status}`);

    if (!response.ok) {
      console.error("❌ Helius DAS API error:", data);
      return NextResponse.json(
        { 
          error: "Failed to fetch owned NFTs", 
          details: data.error?.message || "Unknown error from Helius API"
        },
        { status: response.status }
      );
    }

    if (data.error) {
      console.error("❌ Helius DAS API returned error:", data.error);
      return NextResponse.json(
        { error: "Helius API error", details: data.error },
        { status: 400 }
      );
    }

    // Process and filter NFTs (exclude any that might not be true NFTs)
    const nfts = data.result?.items?.filter((asset: any) => {
      // Filter for actual NFTs (not tokens/other assets)
      return asset.interface === 'V1_NFT' || asset.interface === 'V2_NFT' || 
             (asset.content && asset.content.metadata && asset.content.metadata.name);
    }).map((asset: any) => ({
      id: asset.id,
      name: asset.content?.metadata?.name || 'Unnamed NFT',
      description: asset.content?.metadata?.description || '',
      image: asset.content?.files?.[0]?.uri || asset.content?.links?.image || null,
      collection: asset.grouping?.[0]?.group_value || null,
      mint_address: asset.id,
      compressed: asset.compression?.compressed || false,
      external_url: asset.content?.metadata?.external_url || null,
      // Additional fields useful for listing
      royalty: asset.royalty?.percent || 0,
      creators: asset.creators || [],
      owner: asset.ownership?.owner || ownerAddress,
      tokenStandard: asset.token_info?.token_standard || null
    }));

    console.log(`✅ Successfully fetched ${nfts?.length || 0} NFTs for ${ownerAddress}`);

    return NextResponse.json({
      success: true,
      count: nfts?.length || 0,
      nfts: nfts || [],
      totalResults: data.result?.total || 0
    });

  } catch (error) {
    console.error("❌ Error in owned-nfts API:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch owned NFTs", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
