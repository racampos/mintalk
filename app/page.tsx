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

        <div 
          className="grid gap-6" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '1.5rem' 
          }}
        >
          {items.map((a) => (
            <div
              key={a.id}
              className="bg-white border rounded-xl p-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-full h-64 rounded-lg overflow-hidden bg-neutral-100 mb-3">
                {a.image ? (
                  <Image
                    src={a.image}
                    alt={a.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <span className="text-sm">No image</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-900 leading-tight" title={a.name}>
                    {a.name}
                  </h3>
                  {a.compressed && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex-shrink-0">
                      cNFT
                    </span>
                  )}
                </div>
                
                {a.collection && (
                  <p className="text-xs text-neutral-600 truncate" title={a.collection}>
                    {a.collection}
                  </p>
                )}
                
                {a.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2" title={a.description}>
                    {a.description}
                  </p>
                )}
                
                <a
                  href={a.external_url ?? `https://explorer.solana.com/address/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  View Details →
                </a>
              </div>
            </div>
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
