**Goal:** Build a Next.js 14 (App Router, TypeScript, Tailwind) web app that lets me enter **keywords** and see **matching Solana NFTs**. Use **Helius DAS** as the backend.

**Key APIs (JSON-RPC over HTTPS):**

- Base URL: `https://mainnet.helius-rpc.com/?api-key=...` (Devnet is `https://devnet.helius-rpc.com/?api-key=...`) ([Helius][3])
- Methods we’ll call:

  - `getAssetsByGroup` — browse assets in a collection via `groupKey="collection"`, `groupValue=<collection address>`. ([Helius][4])
  - `searchAssets` — general discovery with paging/sorting and flags like `tokenType`. We’ll use it sparingly, but support it for future filters. ([Helius][5])

- Accepted `tokenType` values include `regularNft`, `compressedNft`, `nonFungible`, etc. (we’ll default to `nonFungible`). ([Helius][3])

**Important note:** DAS provides powerful **structured queries** (owner/creator/collection/compressed flags, pagination, etc.), but not a universal full-text “search everything” parameter. For this PoC, implement **keyword → (fuzzy) collection match → fetch assets → filter by text locally.** ([Metaplex Developer Hub][2])

---

## 1) Scaffold + setup

1. Create a new Next.js app with Tailwind and TypeScript.

```
npx create-next-app@latest solana-nft-search --ts --eslint
cd solana-nft-search
npx tailwindcss init -p
```

2. Configure Tailwind (`tailwind.config.ts`) to scan the `/app` directory. Add a simple base style in `globals.css`.

3. Add env:

```
# .env.local
HELIUS_API_KEY=YOUR_KEY
HELIUS_RPC_URL=https://mainnet.helius-rpc.com
```

(Free keys from the Helius dashboard work; free tier includes 100k DAS calls/month.) ([Helius][1])

4. Allow external NFT images:

```ts
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};
export default nextConfig;
```

---

## 2) Minimal data layer (Helius client)

Create `lib/helius.ts` with narrowly typed helpers for JSON-RPC:

```ts
// lib/helius.ts
type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: any;
};

const HELIUS_RPC_URL =
  process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com";
const API_KEY = process.env.HELIUS_API_KEY;

async function heliusRpc<T>(method: string, params: any): Promise<T> {
  if (!API_KEY) throw new Error("Missing HELIUS_API_KEY");
  const url = `${HELIUS_RPC_URL}/?api-key=${API_KEY}`;

  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: `rpc-${method}`,
    method,
    params,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Increase if needed for larger payloads:
    body: JSON.stringify(body),
    // Cache only on server; clients will hit our API route:
    next: { revalidate: 30 },
  });

  const json = await res.json();
  if (!res.ok || json.error)
    throw new Error(json?.error?.message ?? `RPC ${method} failed`);
  return json.result as T;
}

export type DasAsset = {
  id: string;
  interface?: string;
  content?: {
    json_uri?: string;
    files?: { uri?: string; mime?: string }[];
    metadata?: {
      name?: string;
      description?: string;
      attributes?: { trait_type?: string; value?: string }[];
    };
    links?: { image?: string; external_url?: string };
  };
  grouping?: { group_key: string; group_value: string }[];
  compression?: { compressed?: boolean };
};

export type DasListResponse = {
  total?: number;
  limit?: number;
  page?: number;
  cursor?: string;
  items: DasAsset[];
  nativeBalance?: any;
};

export async function getAssetsByCollection(
  collectionAddress: string,
  page = 1,
  limit = 50
) {
  return heliusRpc<DasListResponse>("getAssetsByGroup", {
    groupKey: "collection",
    groupValue: collectionAddress,
    page,
    limit,
  }); // :contentReference[oaicite:8]{index=8}
}

export async function searchAssets(params: any) {
  // Minimal: let caller pass tokenType, ownerAddress, compressed, page/limit, sortBy, etc.
  return heliusRpc<DasListResponse>("searchAssets", params); // :contentReference[oaicite:9]{index=9}
}
```

---

## 3) Seed a tiny collection registry

Create `data/collections.json` — a small array of `{ name: string; address: string }`. (Fill with a handful you care about; we’ll fuzzy-match the keyword to these names, then call `getAssetsByGroup`.)

```json
[
  { "name": "Mad Lads", "address": "COLLECTION_ADDRESS_HERE" },
  {
    "name": "Famous Fox Federation",
    "address": "BUjZjAS2vbbb65g7Z1Ca9ZRVYoJscURG5L3AkVvHP9ac"
  },
  { "name": "Another Collection", "address": "COLLECTION_ADDRESS_HERE" }
]
```

(We use DAS’s **collection grouping** under the hood to fetch assets for a given collection.) ([Helius][4])

---

## 4) API route (server) — `/api/search`

- Accepts `q` (keyword), `page`, `limit`, `tokenType` (default `nonFungible`), `includeCompressed` (bool).
- Strategy:

  1. Fuzzy-match `q` against `collections.json` to get candidate collections.
  2. For each matched collection (top 3), call `getAssetsByCollection`.
  3. Merge items, then **filter in Node** by checking if `name`, `description`, or attribute values include the keyword (case-insensitive).
  4. Return a compact JSON with minimal fields used by the UI.

```ts
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
    // We’ll request NFTs and then apply the same client-side text filter.
    const res = await searchAssets({
      tokenType: includeCompressed ? "nonFungible" : "regularNft", // regularNft = uncompressed only
      page,
      limit,
      sortBy: { sortBy: "recent_action", sortDirection: "desc" },
    }); // :contentReference[oaicite:11]{index=11}
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
```

> Why `getAssetsByGroup`? It’s the **collection browser**: pass `groupKey: "collection"` + `groupValue` to enumerate a collection’s NFTs. Perfect for “browse by collection” UX. ([Helius][4])
> Why `searchAssets` fallback? It’s the general discovery method with paging/sorting and token type filters. ([Helius][5])

---

## 5) UI — simple search & results grid

Create `app/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type UiAsset = {
  id: string;
  name: string;
  image: string | null;
  description: string;
  collection: string | null;
  compressed: boolean;
  external_url: string | null;
};

export default function Home() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UiAsset[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=60`
      );
      const json = await res.json();
      setItems(json.items ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // optional: default query
    // setQ('fox'); runSearch();
  }, []);

  return (
    <main className="min-h-dvh p-6 bg-neutral-50">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold mb-4">
          Solana NFT Search (Helius DAS)
        </h1>

        <form onSubmit={runSearch} className="flex gap-2 mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try a keyword (e.g., fox, hoodie, gold)"
            className="flex-1 rounded-xl border px-4 py-3 bg-white"
          />
          <button
            className="rounded-xl px-5 py-3 bg-black text-white disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((a) => (
            <a
              key={a.id}
              href={
                a.external_url ?? `https://explorer.solana.com/address/${a.id}`
              }
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl bg-white border hover:shadow-md transition p-3"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100">
                {a.image ? (
                  <Image
                    src={a.image}
                    alt={a.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-neutral-400">
                    no image
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium truncate" title={a.name}>
                    {a.name}
                  </h3>
                  {a.compressed && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border">
                      cNFT
                    </span>
                  )}
                </div>
                {a.collection && (
                  <p
                    className="text-xs text-neutral-500 mt-1 truncate"
                    title={a.collection}
                  >
                    Collection: {a.collection}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>

        {!loading && items.length === 0 && q && (
          <p className="text-neutral-500 mt-6">
            No matches yet. Try another keyword or add more collections to{" "}
            <code>data/collections.json</code>.
          </p>
        )}
      </div>
    </main>
  );
}
```

---

## 6) Nice-to-haves (add after it works)

- **Pagination:** expose `page` in `/api/search` and add a “Load more” button that increments and appends. DAS supports page/limit and cursor (`before`/`after`) for faster infinite scroll. ([Helius][3])
- **Filters:** add toggles for `compressed` vs `regularNft`, and sorting via `sortBy: { sortBy: 'recent_action', sortDirection: 'desc' }`. ([Helius][3])
- **Collection stats view:** if a user clicks a collection, fetch its assets by `groupKey: "collection"` and render a dedicated page (ME/Tensor-style browsing). ([Helius][4])
- **Security:** keep the API key server-side only (never call Helius directly from the client).
- **Rate limits & caching:** add route-level caching (`revalidate`) and basic rate limiting if deploying to Vercel.

---

## Why Helius here?

- **Standard DAS interface** with full coverage of NFTs and compressed NFTs, all via JSON-RPC (so you can switch providers later if needed). ([Metaplex Developer Hub][6])
- **Clear docs + quickstart** and examples of `searchAssets` / `getAssetsByGroup`, plus the API-key pattern `?api-key=...`. ([Helius][1])
