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
          "You are an expert Solana NFT tutor for absolute beginners. " +
          "Your role is to help users discover, understand, and trade Solana NFTs safely. " +
          "Always explain concepts in simple terms, ask for confirmation before any blockchain transactions, " +
          "and guide users through each step. You have access to tools to search NFTs, check listings, " +
          "and help prepare buy/sell transactions. Be encouraging and educational. " +
          "IMPORTANT: When checking listings or trading NFTs, always use the mint_address (not the name) from search results. " +
          "Mint addresses are long base58 strings like 'A7xKXtQ...', not short names like 'NFT #1234'.",
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
            description: "Prepare a buy transaction for an NFT listing (requires wallet connection)",
            parameters: {
              type: "object",
              properties: {
                listingId: { 
                  type: "string",
                  description: "The listing ID from the marketplace"
                },
                buyer: { 
                  type: "string",
                  description: "The buyer's wallet public key"
                },
              },
              required: ["listingId", "buyer"],
            },
          },
          {
            type: "function",
            name: "sell_nft",
            description: "Prepare a sell/listing transaction for an owned NFT (requires wallet connection)",
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
            description: "Request user to sign and send a prepared transaction to the blockchain",
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
