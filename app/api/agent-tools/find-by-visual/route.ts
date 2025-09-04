import { NextRequest, NextResponse } from "next/server";
import visualDescriptions from "@/data/visual-descriptions.json";
import { getAssetsByCollection } from "@/lib/helius";
import registry from "@/data/collections.json";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { visualQuery, collectionContext } = await req.json();
    
    if (!visualQuery) {
      return NextResponse.json(
        { error: "visualQuery is required" },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log(`🔍 Visual search request: "${visualQuery}"`);
    console.log(`📂 Collection context: ${collectionContext || "All collections"}`);

    // Get all available visual descriptions
    const allDescriptions = visualDescriptions as Record<string, string>;
    const descriptionsCount = Object.keys(allDescriptions).length;
    
    console.log(`📊 Total visual descriptions available: ${descriptionsCount}`);

    if (descriptionsCount === 0) {
      return NextResponse.json({
        success: false,
        message: "No visual descriptions available. Please generate visual descriptions first.",
        matches: []
      });
    }

    // Prepare the prompt for GPT to match visual descriptions
    const descriptionsText = Object.entries(allDescriptions)
      .map(([mint, description]) => `${mint}: ${description}`)
      .join('\n\n');

    const matchingPrompt = `You are an expert at matching visual descriptions of NFTs. A user is looking for an NFT based on visual characteristics.

USER'S VISUAL QUERY: "${visualQuery}"

AVAILABLE NFT VISUAL DESCRIPTIONS:
${descriptionsText}

Your task:
1. Find the NFT(s) that best match the user's visual query
2. Be flexible with matching - "green glasses" should match "green goggles", "hat" should match "beanie", etc.
3. Return up to 3 best matches, ranked by confidence

Respond with a JSON object in this exact format:
{
  "matches": [
    {
      "mint": "exact_mint_address",
      "confidence": 0.95,
      "matchReason": "Brief explanation of why this matches"
    }
  ]
}

If no good matches found, return { "matches": [] }.`;

    console.log(`🤖 Calling OpenAI for visual matching...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective for this matching task
        messages: [
          {
            role: 'user',
            content: matchingPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for consistent matching
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error:`, response.status, errorText);
      return NextResponse.json(
        { 
          error: "Failed to process visual matching request",
          details: errorText 
        },
        { status: response.status }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0]?.message?.content?.trim();
    
    if (!aiContent) {
      console.error(`❌ Empty response from OpenAI`);
      return NextResponse.json(
        { error: "Empty response from AI matching service" },
        { status: 500 }
      );
    }

    console.log(`🎯 Raw AI response:`, aiContent);

    // Parse the AI response (handle markdown code blocks)
    let cleanedContent = aiContent;
    if (aiContent.includes('```json')) {
      cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
    }

    let matchingResult;
    try {
      matchingResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(`❌ Failed to parse AI response:`, parseError);
      console.error(`Raw content:`, aiContent);
      return NextResponse.json(
        { error: "Failed to parse AI matching response", details: aiContent },
        { status: 500 }
      );
    }

    if (!matchingResult.matches || !Array.isArray(matchingResult.matches)) {
      console.error(`❌ Invalid AI response format:`, matchingResult);
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    const matches = matchingResult.matches;
    console.log(`✅ Found ${matches.length} visual matches`);

    // Fetch NFT names for matches (using the search API to get names)
    let nftNames: Record<string, string> = {};
    
    try {
      // Get Okay Bears collection to match mint addresses to names
      const okaybears = registry.find(c => c.name === "Okay Bears");
      if (okaybears) {
        const nftData = await getAssetsByCollection(okaybears.address, 1, 30);
        if (nftData.items) {
          nftData.items.forEach((nft: any) => {
            if (nft.content?.metadata?.name) {
              nftNames[nft.id] = nft.content.metadata.name;
            }
          });
          console.log(`📋 Loaded ${Object.keys(nftNames).length} NFT names for matching`);
        }
      }
    } catch (error) {
      console.error("⚠️ Failed to load NFT names, proceeding without names:", error);
    }

    // Enrich matches with full visual descriptions and names
    const enrichedMatches = matches.map((match: any) => ({
      ...match,
      fullDescription: allDescriptions[match.mint] || "Description not found",
      nftName: nftNames[match.mint] || `NFT ${match.mint.substring(0, 8)}...`
    }));

    // Prepare user-friendly response
    let responseMessage;
    if (enrichedMatches.length === 0) {
      responseMessage = `I couldn't find any NFTs matching "${visualQuery}". Try describing different visual features like colors, accessories, expressions, or backgrounds.`;
    } else if (enrichedMatches.length === 1) {
      const match = enrichedMatches[0];
      responseMessage = `Found a perfect match! It's ${match.nftName}. ${match.matchReason}`;
    } else {
      const topMatch = enrichedMatches[0];
      const alternatives = enrichedMatches.slice(1).map((m: any) => `${m.nftName} - ${m.matchReason}`).join(', ');
      responseMessage = `Found ${enrichedMatches.length} matches! Best match: ${topMatch.nftName} - ${topMatch.matchReason}. Alternatives: ${alternatives}`;
    }

    return NextResponse.json({
      success: true,
      query: visualQuery,
      matches: enrichedMatches,
      message: responseMessage,
      searchStats: {
        totalDescriptions: descriptionsCount,
        matchesFound: enrichedMatches.length,
        confidenceRange: enrichedMatches.length > 0 ? 
          `${Math.min(...enrichedMatches.map((m: any) => m.confidence))} - ${Math.max(...enrichedMatches.map((m: any) => m.confidence))}` : 
          'N/A'
      }
    });

  } catch (error) {
    console.error("❌ Error in visual search:", error);
    return NextResponse.json(
      { 
        error: "Failed to process visual search request",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
