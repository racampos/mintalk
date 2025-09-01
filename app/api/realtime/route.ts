import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/realtime/sessions";

export async function GET(req: NextRequest) {
  const requestId = new URL(req.url).searchParams.get('_rid') || 'unknown';
  console.log(`🎯 Processing realtime session request ${requestId}`);
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ OpenAI API key not found in environment variables");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime";
    const voice = process.env.OPENAI_REALTIME_VOICE ?? "alloy";
    
    console.log(`🔧 Creating Realtime session with model: ${model}, voice: ${voice}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        modalities: ["text", "audio"],
        instructions:
          "You are an expert Solana NFT trading assistant with FULL TRANSACTION CAPABILITIES. " +
          "Your role is to help users discover, understand, and trade Solana NFTs safely using Web3Auth embedded wallets. " +
          "You CAN execute actual NFT purchases and sales, not just guide users through them. " +
          "When users want to buy an NFT: 1) Get their wallet info with get_wallet_info, 2) Get listings with get_listings, 3) Confirm price with user, 4) Execute purchase with buy_nft + request_wallet_signature. " +
          "Always explain concepts in simple terms, ask for explicit confirmation before spending SOL, " +
          "and execute transactions when users confirm. You have tools to search NFTs, check listings, " +
          "and execute complete buy/sell transactions. Be encouraging and educational. " +
          "IMPORTANT: When checking listings or trading NFTs, always use the mint_address (not the name) from search results. " +
          "Mint addresses are long base58 strings like 'A7xKXtQ...', not short names like 'NFT #1234'. " +
          "For buy_nft: use mint=tokenMint, listingId=id, seller=sellerAddress, price=price from get_listings response. IMPORTANT: Use sellerAddress (full address), not seller (truncated display version).",
        tools: [
          {
            type: "function",
            name: "search_nfts",
            description: "Search for Solana NFTs using keywords via Helius DAS API",
            parameters: {
              type: "object",
              properties: {
                q: { 
                  type: "string", 
                  description: "Search keyword or collection name" 
                },
                includeCompressed: { 
                  type: "boolean", 
                  description: "Include compressed NFTs in results"
                },
                page: { 
                  type: "integer", 
                  description: "Page number for pagination"
                },
                limit: { 
                  type: "integer", 
                  description: "Number of results per page"
                },
              },
              required: ["q"],
            },
          },
          {
            type: "function",
            name: "get_listings",
            description: "Fetch marketplace listings for a specific NFT by its mint address (use mint_address from search results, not the NFT name)",
            parameters: {
              type: "object",
              properties: { 
                mint: { 
                  type: "string",
                  description: "The full Solana mint address (base58 string) from search results - NOT the NFT display name"
                } 
              },
              required: ["mint"],
            },
          },
          {
            type: "function",
            name: "buy_nft",
            description: "Execute a complete NFT purchase - creates buy transaction and processes payment via Web3Auth wallet",
            parameters: {
              type: "object",
              properties: {
                mint: { 
                  type: "string",
                  description: "The NFT mint address (tokenMint from listings)"
                },
                listingId: { 
                  type: "string",
                  description: "The listing ID from the marketplace (id from listings)"
                },
                seller: { 
                  type: "string",
                  description: "The seller's full wallet address (use sellerAddress from price summary, or seller from get_listings - must be full base58 address, not truncated)"
                },
                price: { 
                  type: "number",
                  description: "The listing price in SOL"
                },
                buyer: { 
                  type: "string",
                  description: "The buyer's wallet public key"
                },
              },
              required: ["mint", "listingId", "seller", "price", "buyer"],
            },
          },
          {
            type: "function",
            name: "sell_nft",
            description: "Execute NFT listing for sale - creates listing transaction and posts NFT to marketplace via Web3Auth wallet",
            parameters: {
              type: "object",
              properties: {
                mint: { 
                  type: "string",
                  description: "The mint address of the NFT to sell"
                },
                priceLamports: { 
                  type: "number",
                  description: "Price in lamports (1 SOL = 1,000,000,000 lamports)"
                },
                seller: { 
                  type: "string",
                  description: "The seller's wallet public key"
                },
              },
              required: ["mint", "priceLamports", "seller"],
            },
          },
          {
            type: "function",
            name: "request_wallet_signature",
            description: "Execute blockchain transaction by signing and submitting with the connected Web3Auth wallet",
            parameters: {
              type: "object",
              properties: {
                txBase64: { 
                  type: "string",
                  description: "Base64 encoded transaction data"
                },
                connection: { 
                  type: "string", 
                  enum: ["mainnet", "devnet"],
                  description: "Solana network to use"
                },
                description: {
                  type: "string",
                  description: "Human-readable description of what the transaction does"
                }
              },
              required: ["txBase64"],
            },
          },
          {
            type: "function",
            name: "get_price_summary",
            description: "Get a comprehensive price summary for multiple NFTs from search results",
            parameters: {
              type: "object",
              properties: {
                mints: { 
                  type: "array",
                  items: { type: "string" },
                  description: "Array of NFT mint addresses to check for pricing"
                }
              },
              required: ["mints"],
            },
          },
          {
            type: "function",
            name: "get_wallet_info",
            description: "Get the current connected Web3Auth wallet address and connection status",
            parameters: {
              type: "object",
              properties: {},
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI Realtime API error (${response.status}):`, errorText);
      
      // Parse error if it's JSON
      let errorDetail;
      try {
        errorDetail = JSON.parse(errorText);
      } catch {
        errorDetail = { message: errorText };
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create realtime session",
          details: errorDetail,
          status: response.status,
          model,
          voice 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ Realtime session created successfully for model: ${model} (Request ${requestId})`);
    
    // Add server timing info for debugging
    if (data.client_secret) {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = data.client_secret.expires_at;
      const secondsUntilExpiry = expiresAt - now;
      console.log(`⏰ Server timing: token expires in ${secondsUntilExpiry} seconds from server perspective`);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
