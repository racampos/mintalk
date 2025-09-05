#!/usr/bin/env node

/**
 * Visual Description Preprocessing Script
 * 
 * This script generates visual descriptions for all NFTs in our curated collections
 * using OpenAI's GPT-4 Vision API. It replicates the exact search logic from 
 * app/api/search/route.ts to ensure we process the same 30 NFTs that users see.
 */

const fs = require('fs/promises');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Import our collections registry
const registry = require('../data/collections.json');

const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!HELIUS_API_KEY) {
  console.error("❌ HELIUS_API_KEY not found in environment variables");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found in environment variables");
  process.exit(1);
}

// Helius API helper (replicated from lib/helius.ts)
async function heliusRpc(method, params) {
  const url = `${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`;
  
  const body = {
    jsonrpc: "2.0",
    id: `rpc-${method}`,
    method,
    params,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Helius RPC error: ${JSON.stringify(json.error || { status: res.status })}`);
  }

  return json.result;
}

// Get assets by collection (replicated from lib/helius.ts)
async function getAssetsByCollection(collectionAddress, page = 1, limit = 50) {
  return heliusRpc("getAssetsByGroup", {
    groupKey: "collection",
    groupValue: collectionAddress,
    page,
    limit,
  });
}

// Text matching logic (replicated from app/api/search/route.ts)
function textMatches(asset, q, foundByCollection = false) {
  const needle = q.toLowerCase();
  const name = asset.content?.metadata?.name?.toLowerCase() ?? "";
  const desc = asset.content?.metadata?.description?.toLowerCase() ?? "";
  const traits = (asset.content?.metadata?.attributes ?? [])
    .map((a) => `${a.trait_type ?? ""} ${a.value ?? ""}`.toLowerCase())
    .join(" ");
  
  // If we found this asset by collection matching, be more lenient with text matching
  if (foundByCollection) {
    // Split search query into words and match if ANY word appears
    const searchWords = needle.split(/\s+/).filter(w => w.length > 2); // Skip short words
    return searchWords.some(word => 
      name.includes(word) || desc.includes(word) || traits.includes(word)
    );
  }
  
  // Original strict matching for non-collection searches
  return (
    name.includes(needle) || desc.includes(needle) || traits.includes(needle)
  );
}

// OpenAI Vision API call
async function generateVisualDescription(imageUrl, nftName, collectionName) {
  try {
    console.log(`  📸 Analyzing: ${nftName}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // More cost-effective than gpt-4o for this task
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this NFT from the "${collectionName}" collection and provide a concise but detailed visual description for voice search purposes. Focus on distinctive visual features that would help someone identify this specific NFT when they say things like "the one with laser eyes" or "the bear with the red hat". Include: main character/subject, colors, accessories, expressions, background elements, and any unique visual features. Keep it under 100 words and avoid metadata like numbers or generic collection info.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low' // Sufficient for our needs and more cost-effective
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.3, // Lower temperature for consistent descriptions
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`    ❌ OpenAI API error for ${nftName}:`, response.status, errorText);
      return null;
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content?.trim();
    
    if (!description) {
      console.error(`    ❌ Empty description received for ${nftName}`);
      return null;
    }

    console.log(`    ✅ Generated description for ${nftName}: ${description.substring(0, 80)}...`);
    return description;

  } catch (error) {
    console.error(`    ❌ Error generating description for ${nftName}:`, error.message);
    return null;
  }
}

// Helper function to select the best available image URL (same logic as search API)
function selectBestImageUrl(asset) {
  if (!asset.content) return null;
  
  // First, check if canonical image (content.links.image) is from a reliable source
  const canonicalImage = asset.content.links?.image;
  if (canonicalImage) {
    // Only override canonical image if it's from known unreliable sources
    const isUnreliableSource = canonicalImage.includes('shdw-drive.genesysgo.net');
    
    if (!isUnreliableSource) {
      // Use canonical image - it's the official/main image for this NFT
      return canonicalImage;
    }
  }
  
  // Fallback: If canonical image is unreliable or missing, use prioritized alternatives
  const imageFiles = asset.content.files?.filter(f => 
    f.uri && f.mime?.startsWith("image/")
  ) || [];
  
  // Priority for alternatives: Arweave > IPFS > other sources > Shadow Drive
  const alternativeSources = imageFiles.sort((a, b) => {
    const getSourcePriority = (uri) => {
      if (uri.includes('arweave.net')) return 1;
      if (uri.includes('ipfs.') || uri.includes('/ipfs/')) return 2;
      if (uri.includes('shdw-drive.genesysgo.net')) return 4; // Lowest priority
      return 3; // Other sources
    };
    return getSourcePriority(a.uri) - getSourcePriority(b.uri);
  });
  
  return alternativeSources.length > 0 ? alternativeSources[0].uri : canonicalImage;
}

// Process a single collection
async function processCollection(collection, testMode = false) {
  console.log(`\n🔍 Processing collection: ${collection.name}`);
  console.log(`📍 Collection address: ${collection.address}`);

  try {
    // Step 1: Get NFTs using same logic as search API
    console.log(`📥 Fetching NFTs from Helius...`);
    const searchLimit = 30; // Same as search API default
    const result = await getAssetsByCollection(collection.address, 1, searchLimit);
    
    console.log(`📊 Raw results from Helius: ${result.items?.length || 0} items`);

    if (!result.items || result.items.length === 0) {
      console.log(`  ⚠️  No NFTs found for ${collection.name}`);
      return {};
    }

    // Step 2: Apply same text filtering as search API
    const foundByCollection = true;
    const filtered = result.items.filter(asset => 
      textMatches(asset, collection.name, foundByCollection)
    );

    console.log(`🔄 After text filtering: ${filtered.length} items`);

    // Step 3: Take same slice as search API (first 30)
    const final30 = filtered.slice(0, 30);
    console.log(`✂️  Final NFTs to process: ${final30.length} items`);

    // Step 4: Shape response same as search API
    const shapedNFTs = final30.map(asset => ({
      id: asset.id,
      name: asset.content?.metadata?.name ?? "Untitled",
      image: selectBestImageUrl(asset),
      description: asset.content?.metadata?.description ?? "",
      collection: asset.grouping?.find(g => g.group_key === "collection")?.group_value ?? null,
      compressed: !!asset.compression?.compressed,
      external_url: asset.content?.links?.external_url ?? null,
    }));

    // Step 5: Generate visual descriptions
    console.log(`🎨 Generating visual descriptions...`);
    const visualDescriptions = {};
    let processed = 0;
    let successful = 0;

    for (const nft of shapedNFTs) {
      if (!nft.image) {
        console.log(`  ⏭️  Skipping ${nft.name} (no image)`);
        continue;
      }

      processed++;
      
      // In test mode, only process first 3 NFTs
      if (testMode && processed > 3) {
        console.log(`  🧪 Test mode: stopping after 3 NFTs`);
        break;
      }

      const description = await generateVisualDescription(nft.image, nft.name, collection.name);
      
      if (description) {
        visualDescriptions[nft.id] = description;
        successful++;
      }

      // Rate limiting - wait 1 second between requests
      if (processed < shapedNFTs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Collection ${collection.name} completed: ${successful}/${processed} descriptions generated`);
    return visualDescriptions;

  } catch (error) {
    console.error(`❌ Error processing collection ${collection.name}:`, error.message);
    return {};
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const collectionName = args.find(arg => !arg.startsWith('--'));

  console.log('🎯 NFT Visual Description Generator');
  console.log('==================================');
  
  if (testMode) {
    console.log('🧪 Running in TEST MODE (first 3 NFTs only)');
  }

  // Filter collections to process
  let collectionsToProcess;
  if (collectionName) {
    const found = registry.find(c => 
      c.name.toLowerCase().includes(collectionName.toLowerCase())
    );
    if (!found) {
      console.error(`❌ Collection "${collectionName}" not found in registry`);
      console.log('Available collections:');
      registry.forEach(c => console.log(`  - ${c.name}`));
      process.exit(1);
    }
    collectionsToProcess = [found];
    console.log(`🎯 Processing single collection: ${found.name}`);
  } else {
    collectionsToProcess = registry;
    console.log(`🎯 Processing all ${registry.length} collections`);
  }

  // Load existing descriptions if any
  const outputPath = path.join(__dirname, '..', 'data', 'visual-descriptions.json');
  let allDescriptions = {};
  
  try {
    const existing = await fs.readFile(outputPath, 'utf8');
    allDescriptions = JSON.parse(existing);
    console.log(`📂 Loaded ${Object.keys(allDescriptions).length} existing descriptions`);
  } catch (error) {
    console.log('📂 No existing descriptions found, starting fresh');
  }

  // Process collections
  let totalProcessed = 0;
  let totalGenerated = 0;

  for (const collection of collectionsToProcess) {
    const descriptions = await processCollection(collection, testMode);
    const generatedCount = Object.keys(descriptions).length;
    
    // Merge with existing descriptions
    Object.assign(allDescriptions, descriptions);
    
    totalProcessed++;
    totalGenerated += generatedCount;

    // Save after each collection in case of interruption
    await fs.writeFile(outputPath, JSON.stringify(allDescriptions, null, 2));
    console.log(`💾 Saved progress to ${outputPath}`);
  }

  console.log('\n🎉 Processing Complete!');
  console.log('=====================');
  console.log(`📊 Collections processed: ${totalProcessed}`);
  console.log(`📸 Visual descriptions generated: ${totalGenerated}`);
  console.log(`📁 Total descriptions in database: ${Object.keys(allDescriptions).length}`);
  console.log(`📂 Output file: ${outputPath}`);

  // Show sample descriptions
  if (totalGenerated > 0) {
    console.log('\n📋 Sample descriptions generated:');
    const samples = Object.entries(allDescriptions).slice(-Math.min(3, totalGenerated));
    samples.forEach(([mint, description], index) => {
      console.log(`${index + 1}. ${mint.substring(0, 8)}...: ${description.substring(0, 100)}...`);
    });
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
