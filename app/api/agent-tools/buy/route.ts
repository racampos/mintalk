import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// Magic Eden API base URL
const MAGIC_EDEN_API = "https://api-mainnet.magiceden.dev/v2";

export async function POST(req: NextRequest) {
  try {
    const { mint, listingId, seller, price, buyer } = await req.json();
    
    if (!mint || !listingId || !seller || !buyer || price === undefined) {
      return NextResponse.json(
        { error: "mint, listingId, seller, price, and buyer are required" },
        { status: 400 }
      );
    }

    console.log(`🛒 Preparing buy transaction:`);
    console.log(`  - NFT Mint: ${mint}`);
    console.log(`  - Listing ID: ${listingId}`);
    console.log(`  - Seller: ${seller}`);
    console.log(`  - Price: ${price} SOL`);
    console.log(`  - Buyer: ${buyer}`);

    // First, verify the token exists
    const tokenResponse = await fetch(
      `${MAGIC_EDEN_API}/tokens/${mint}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!tokenResponse.ok) {
      console.error(`Failed to verify token: ${tokenResponse.status}`);
      return NextResponse.json(
        { error: `Failed to verify token: ${tokenResponse.status}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log(`📋 Token verified:`, tokenData.name || 'Unknown NFT');

    // Get buy instruction from Magic Eden with API key authentication
    try {
      console.log(`🔄 Calling Magic Eden buy_now API with authentication...`);
      const apiKey = process.env.MAGIC_EDEN_API_KEY;
      if (!apiKey) {
        throw new Error("MAGIC_EDEN_API_KEY not found in environment variables");
      }

      // Calculate the seller's Associated Token Account (ATA) for the NFT mint
      const mintPubkey = new PublicKey(mint);
      const sellerPubkey = new PublicKey(seller);
      const sellerTokenATA = getAssociatedTokenAddressSync(mintPubkey, sellerPubkey);
      
      console.log(`🔗 Calculated seller ATA: ${sellerTokenATA.toString()}`);
      console.log(`📋 Original seller wallet: ${seller}`);
      
      // Build query parameters for GET request
      const params = new URLSearchParams({
        tokenMint: mint,
        buyer: buyer,
        seller: seller,
        tokenATA: sellerTokenATA.toString(), // Seller's ATA for the NFT mint (not wallet address)
        price: price.toString(), // Magic Eden API expects SOL, not lamports
        auctionHouseAddress: "E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe", // Correct Magic Eden auction house
        sellerExpiry: "0" // No expiry (0 instead of -1)
      });

      console.log(`📋 Query parameters:`, params.toString());

      const buyResponse = await fetch(
        `${MAGIC_EDEN_API}/instructions/buy_now?${params.toString()}`,
        {
          method: "GET", // Changed from POST to GET
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }
          // No body for GET request
        }
      );

      console.log(`📡 Magic Eden API Response Status: ${buyResponse.status}`);
      
      if (buyResponse.ok) {
        const buyData = await buyResponse.json();
        console.log(`✅ Magic Eden buy instruction received:`, buyData);
        
        let txBase64 = null;
        let txSource = null;
        
        // Prefer txSigned fields (include Magic Eden's pre-signatures) per best practices
        // Priority: v0.txSigned > txSigned > v0.tx > tx
        const txPaths = [
          { path: ["v0", "txSigned", "data"], label: "v0.txSigned (v0 with ME pre-sigs)" },
          { path: ["txSigned", "data"], label: "txSigned (legacy with ME pre-sigs)" },
          { path: ["v0", "tx", "data"], label: "v0.tx (unsigned v0)" },
          { path: ["tx", "data"], label: "tx (unsigned legacy)" },
        ];
        
        for (const { path, label } of txPaths) {
          let data = buyData;
          for (const key of path) {
            data = data?.[key];
          }
          
          if (Array.isArray(data) && data.length > 0) {
            const txBuffer = Buffer.from(data);
            txBase64 = txBuffer.toString('base64');
            txSource = label;
            console.log(`🔄 Using ${label}: converted ${txBuffer.length} bytes to base64`);
            break;
          }
        }
        
        // Fallback to direct base64 fields
        if (!txBase64) {
          if (buyData.txBase64) {
            txBase64 = buyData.txBase64;
            txSource = "txBase64 field";
            console.log(`✅ Using pre-encoded txBase64 from Magic Eden`);
          } else if (typeof buyData.tx === 'string') {
            txBase64 = buyData.tx;
            txSource = "tx string field";
            console.log(`✅ Using tx string from Magic Eden`);
          }
        }
        
        if (txBase64) {
          return NextResponse.json({
            txBase64: txBase64,
            message: "✅ Real NFT purchase transaction prepared via Magic Eden API",
            details: {
              mint,
              listingId, 
              seller,
              price,
              buyer,
              tokenName: tokenData.name || "Unknown NFT",
              method: "magic_eden_api",
              txSource: txSource,  // Which field we used
              blockhash: buyData.blockhashData?.blockhash?.substring(0, 8) + "..." || "N/A",
              lastValidBlockHeight: buyData.blockhashData?.lastValidBlockHeight || "N/A"
            },
            instructions: `This will execute a real NFT purchase for "${tokenData.name || 'Unknown NFT'}" via Magic Eden marketplace. You will receive the NFT and pay ${price} SOL.`
          });
        } else {
          console.log(`⚠️ Could not extract transaction data from Magic Eden response`);
          console.log(`Available fields:`, Object.keys(buyData));
          console.log(`Available nested paths:`, {
            "v0.txSigned": buyData.v0?.txSigned ? "present" : "missing",
            "txSigned": buyData.txSigned ? "present" : "missing", 
            "v0.tx": buyData.v0?.tx ? "present" : "missing",
            "tx": buyData.tx ? "present" : "missing",
          });
        }
      } else {
        const errorText = await buyResponse.text();
        console.log(`❌ Magic Eden API Error (${buyResponse.status}):`, errorText);
        
        if (buyResponse.status === 401) {
          console.log(`🔐 Magic Eden API authentication failed - check MAGIC_EDEN_API_KEY`);
          return NextResponse.json({
            error: "Magic Eden API authentication failed",
            details: { 
              mint, 
              seller, 
              price, 
              buyer, 
              tokenName: tokenData.name || "Unknown NFT",
              status: buyResponse.status
            },
            message: `Authentication failed when trying to buy "${tokenData.name || 'Unknown NFT'}". Please check API key.`
          }, { status: 401 });
        } else {
          return NextResponse.json({
            error: "Magic Eden API error",
            details: { 
              mint, 
              seller, 
              price, 
              buyer, 
              tokenName: tokenData.name || "Unknown NFT",
              status: buyResponse.status,
              error: errorText
            },
            message: `Failed to create buy transaction for "${tokenData.name || 'Unknown NFT'}".`
          }, { status: buyResponse.status });
        }
      }
    } catch (buyError) {
      console.log(`⚠️ Magic Eden API call failed:`, buyError);
      return NextResponse.json({
        error: "Magic Eden API call failed",
        details: { 
          mint, 
          seller, 
          price, 
          buyer, 
          tokenName: tokenData.name || "Unknown NFT",
          apiError: buyError instanceof Error ? buyError.message : String(buyError)
        },
        message: `Failed to connect to Magic Eden API for "${tokenData.name || 'Unknown NFT'}".`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Error preparing buy transaction:", error);
    return NextResponse.json(
      { error: "Failed to prepare buy transaction" },
      { status: 500 }
    );
  }
}