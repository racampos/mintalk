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
          "LANGUAGE: Always communicate in English by default unless the user explicitly requests or communicates in another language. If the user speaks in another language, respond in that language to match their preference. " +
          "Your role is to help users discover, understand, and trade Solana NFTs safely using Web3Auth embedded wallets. " +
          "You CAN execute actual NFT purchases and sales, not just guide users through them. " +
          "COMMUNICATION PRIORITY: ALWAYS speak first to explain what you're about to do BEFORE calling any tools. " +
          "For example: 'Let me search for that NFT for you...' then call search_nfts. " +
          "Or: 'I'll check the current listings and prices...' then call get_listings. " +
          "Or: 'Perfect! I'll proceed with purchasing this NFT...' then call buy_nft. " +
          "WEB3AUTH SIGNING: The user's Web3Auth wallet handles transaction signing automatically and seamlessly. " +
          "Do NOT tell users they need to 'approve' or 'sign' anything manually - the wallet integration is automatic. " +
          "Instead say: 'I'll execute the transaction now' or 'Processing the transaction on the blockchain'. " +
          "When users want to buy an NFT: 1) Identify the specific NFT from search results, 2) Use isolate_nft_for_confirmation to show only that NFT, 3) STOP and ask user to confirm they want to buy THAT specific NFT, 4) WAIT for explicit 'yes'/'confirm' from user, 5) ONLY THEN get wallet info and proceed with get_listings + buy_nft + request_wallet_signature. " +
          "When users want to sell/list their NFT: 1) Get their wallet info, 2) Get their owned NFTs with get_owned_nfts, 3) Let user pick which NFT and price, 4) Create listing with list_nft + request_wallet_signature. " +
          "Always explain concepts in simple terms, ask for explicit confirmation before spending SOL or listing NFTs, " +
          "and execute transactions when users confirm. You have tools to search NFTs, check listings, view owned NFTs, " +
          "and execute complete buy/sell transactions. Be encouraging and educational. " +
          "DATA ACCESS: When you search NFTs, you now receive complete access to ALL search results (typically 30 NFTs), not just samples. " +
          "Use get_price_summary with all mint addresses to get comprehensive pricing data - the backend caching makes this efficient. " +
          "NFT IDENTIFICATION: When users want to buy a specific NFT, parse their request carefully. Examples: 'buy number 402' (look for NFT with '402' in name), 'buy the third one' (use index 2 from results), 'buy the cheapest one' (check prices first). " +
          "CRITICAL ISOLATION FLOW: Always use isolate_nft_for_confirmation to show the specific NFT, then STOP and ask something like 'I've isolated [NFT Name] for you to see. Please confirm - do you want to buy this specific NFT?' Then WAIT for the user to say yes/confirm before proceeding with any wallet or purchase actions. The isolation is a mandatory confirmation checkpoint, not just informational. " +
          "OPERATIONAL CONSTRAINTS - DO NOT ATTEMPT: " +
          "• Multiple simultaneous searches - search ONE collection at a time only " +
          "• Complex filtering beyond basic keyword search - use simple collection names " +
          "• Price range filtering in searches - check prices after getting results " +
          "• Batch operations - handle one NFT purchase/sale at a time " +
          "• Cross-chain operations - Solana NFTs only " +
          "• Historical data requests - only current market data available " +
          "SEARCH LIMITATIONS: Each search_nfts call returns ONE collection's results. If user wants multiple collections, explain they need to search each separately and choose which to explore first. " +
          "SEARCH KEYWORD REQUIREMENTS: ONLY use specific collection names or NFT characteristics as search terms. DO NOT use vague terms like 'popular', 'trending', 'best', 'hot', 'top', etc. " +
          "OUR CURATED SOLANA COLLECTIONS: 'Mad Lads' (trendy profile pics), 'Famous Fox Federation' (fox-themed), 'Goatys' (goat characters), 'Okay Bears' (bear-themed), 'Degenerate Ape Academy' (ape collection), 'Solana Business Frogs' (business frog theme), 'Degen Monkes' (monkey collection), 'The Goat Club' (goat club), 'DeGods' (mythical beings), 'Claynosaurz' (clay dinosaurs), 'Frogana' (frog-themed), 'Retardio Cousins' (quirky characters), 'Little Swag World' (swag characters). Use ONLY these collection names. " +
          "COLLECTION RESTRICTIONS: ONLY suggest collections from our curated list above. Do NOT suggest collections not in this list (like Bored Apes, Cryptopunks, etc.). If users ask for collections not in our database, politely explain: 'I can only search our curated Solana collections. Would you like to explore one of these instead: [list 3-4 from our database]?' " +
          "PARTIAL MATCHES: If users say partial names like 'Bears' (meaning Okay Bears) or 'Frogs' (meaning Solana Business Frogs), clarify: 'Did you mean [full collection name]?' then use the exact full name for search. " +
          "If users ask for 'popular' or 'trending' NFTs, suggest from our curated list like 'I can search our curated collections for you! Would you like to explore Mad Lads, Famous Fox Federation, DeGods, or Okay Bears?' " +
          "WHEN USERS REQUEST UNSUPPORTED FEATURES: Politely explain the limitation and offer supported alternatives. For example: 'I can't search multiple collections at once, but I can help you search for [collection name] first. Which collection interests you most?' " +
          "STAY WITHIN CAPABILITIES: Only use the provided tools. Do not attempt to create new functionality or pretend to access data/features that don't exist. " +
          "IMPORTANT: When checking listings or trading NFTs, always use the mint_address (not the name) from search results. " +
          "Mint addresses are long base58 strings like 'A7xKXtQ...', not short names like 'NFT #1234'. " +
          "For buy_nft: use mint=tokenMint, listingId=id, seller=sellerAddress, price=price from get_listings response. IMPORTANT: Use sellerAddress (full address), not seller (truncated display version).",
        tools: [
          {
            type: "function",
            name: "search_nfts",
            description: "Search for Solana NFTs using keywords via Helius DAS API. IMPORTANT: Searches ONE collection at a time only. Returns up to 30 NFTs from the best matching collection. Cannot search multiple collections simultaneously - if user wants multiple collections, tell them to choose one to start with.",
            parameters: {
              type: "object",
              properties: {
                q: { 
                  type: "string", 
                  description: "EXACT collection name from our curated database. Valid options: 'Mad Lads', 'Famous Fox Federation', 'Goatys', 'Okay Bears', 'Degenerate Ape Academy', 'Solana Business Frogs', 'Degen Monkes', 'The Goat Club', 'DeGods', 'Claynosaurz', 'Frogana', 'Retardio Cousins', 'Little Swag World'. Must match exactly - no abbreviations, no variations, no generic terms." 
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
          {
            type: "function",
            name: "get_owned_nfts",
            description: "Fetch NFTs owned by the connected wallet. Use this when user asks about 'my NFTs', 'what NFTs do I own', or wants to list/sell their NFTs.",
            parameters: {
              type: "object",
              properties: {
                ownerAddress: {
                  type: "string",
                  description: "The wallet address of the NFT owner (use from get_wallet_info)"
                }
              },
              required: ["ownerAddress"]
            }
          },
          {
            type: "function",
            name: "list_nft",
            description: "Create a Magic Eden listing transaction to sell/list an NFT. Use this when user wants to 'list', 'sell', or 'put up for sale' their NFT.",
            parameters: {
              type: "object",
              properties: {
                mint: {
                  type: "string", 
                  description: "The mint address of the NFT to list (get from owned NFTs)"
                },
                seller: {
                  type: "string",
                  description: "The seller's wallet address (use from get_wallet_info)"
                },
                price: {
                  type: "number",
                  description: "The listing price in SOL (e.g., 0.5 for 0.5 SOL)"
                },
                expiry: {
                  type: "number",
                  description: "Optional expiry timestamp in seconds (0 for no expiry)",
                  default: 0
                }
              },
              required: ["mint", "seller", "price"]
            }
          },
          {
            type: "function",
            name: "isolate_nft_for_confirmation",
            description: "MANDATORY first step for NFT purchases. Isolates a specific NFT on screen and creates a confirmation checkpoint. Shows only the selected NFT with special styling while hiding all others. After calling this, you MUST ask user to confirm they want to buy this specific NFT and WAIT for their explicit yes/confirm before proceeding with wallet or purchase actions.",
            parameters: {
              type: "object",
              properties: {
                mint: { 
                  type: "string",
                  description: "The mint address of the NFT to isolate and show for confirmation"
                },
                name: {
                  type: "string", 
                  description: "The display name of the NFT for confirmation message"
                },
                collection: {
                  type: "string",
                  description: "The collection name for confirmation message"
                }
              },
              required: ["mint", "name", "collection"]
            }
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
