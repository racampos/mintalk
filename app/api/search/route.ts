// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAssetsByCollection, searchAssets, DasAsset } from "@/lib/helius";
import registry from "@/data/collections.json";

function textMatches(asset: DasAsset, q: string, foundByCollection: boolean = false) {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 30);
  const includeCompressed =
    (searchParams.get("includeCompressed") ?? "true") === "true";

  if (!q) return NextResponse.json({ items: [], page, limit });

  // 1) Smart collection matching - match both ways (collection in query OR query in collection)
  const qLower = q.toLowerCase();
  const candidates = registry
    .filter((c) => {
      const nameLower = c.name.toLowerCase();
      // Match if collection name is in query (e.g., "Goatys" in "Goatys #990")
      // OR if query is in collection name (e.g., "mad" in "Mad Lads")
      return qLower.includes(nameLower) || nameLower.includes(qLower);
    })
    .slice(0, 3);

  let items: DasAsset[] = [];

  if (candidates.length) {
    // For specific NFT searches (contains #), use slightly larger limit to find specific items
    const searchLimit = q.includes('#') ? Math.min(limit * 2, 50) : limit;
    const results = await Promise.all(
      candidates.map((c) => getAssetsByCollection(c.address, page, searchLimit))
    );
    items = results.flatMap((r) => r.items ?? []);
  } else {
    // Fallback: a broad search without tokenType restriction  
    // We'll request recent NFTs and then apply client-side text filter
    try {
      const res = await searchAssets({
        page,
        limit,
        sortBy: { sortBy: "recent_action", sortDirection: "desc" },
      });
      items = res.items ?? [];
    } catch (error) {
      console.error(`Search API fallback failed:`, error);
      items = [];
    }
  }

  // 3) Filter by keyword locally
  const foundByCollection = candidates.length > 0;
  const filtered = items.filter((a) => textMatches(a, q, foundByCollection));

  // 4) Handle empty results with helpful message
  let searchNote = null;
  if (filtered.length === 0 && items.length > 0 && q.includes('#')) {
    searchNote = `Specific NFT "${q}" not found in our search index. Try searching for just the collection name (e.g., "Goatys") to browse available NFTs, or check Magic Eden directly.`;
  }

  // 5) Shape response (cap to limit to prevent UI overload)
  const minimal = filtered.slice(0, limit).map((a) => ({
    id: a.id,
    name: a.content?.metadata?.name ?? "Untitled",
    image:
      a.content?.links?.image ||
      a.content?.files?.find((f) => f.uri && f.mime?.startsWith("image/"))
        ?.uri ||
      null,
    description: a.content?.metadata?.description ?? "",
    collection:
      a.grouping?.find((g) => g.group_key === "collection")?.group_value ??
      null,
    compressed: !!a.compression?.compressed,
    external_url: a.content?.links?.external_url ?? null,
  }));

  return NextResponse.json({ 
    items: minimal, 
    page, 
    limit,
    ...(searchNote && { searchNote })
  });
}
