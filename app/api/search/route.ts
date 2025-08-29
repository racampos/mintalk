// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAssetsByCollection, searchAssets, DasAsset } from "@/lib/helius";
import registry from "@/data/collections.json";

function textMatches(asset: DasAsset, q: string) {
  const needle = q.toLowerCase();
  const name = asset.content?.metadata?.name?.toLowerCase() ?? "";
  const desc = asset.content?.metadata?.description?.toLowerCase() ?? "";
  const traits = (asset.content?.metadata?.attributes ?? [])
    .map((a) => `${a.trait_type ?? ""} ${a.value ?? ""}`.toLowerCase())
    .join(" ");
  return (
    name.includes(needle) || desc.includes(needle) || traits.includes(needle)
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const includeCompressed =
    (searchParams.get("includeCompressed") ?? "true") === "true";

  if (!q) return NextResponse.json({ items: [], page, limit });

  // 1) Fuzzy match collections by name (simple contains; swap with better scorer if desired)
  const candidates = registry
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 3);

  let items: DasAsset[] = [];

  if (candidates.length) {
    const results = await Promise.all(
      candidates.map((c) => getAssetsByCollection(c.address, page, limit))
    );
    items = results.flatMap((r) => r.items ?? []);
  } else {
    // Fallback: a broad search by type. (DAS is structured, not full-text.)
    // We'll request NFTs and then apply the same client-side text filter.
    const res = await searchAssets({
      tokenType: includeCompressed ? "nonFungible" : "regularNft", // regularNft = uncompressed only
      page,
      limit,
      sortBy: { sortBy: "recent_action", sortDirection: "desc" },
    });
    items = res.items ?? [];
  }

  // 3) Filter by keyword locally
  const filtered = items.filter((a) => textMatches(a, q));

  // 4) Shape response
  const minimal = filtered.map((a) => ({
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

  return NextResponse.json({ items: minimal, page, limit });
}
