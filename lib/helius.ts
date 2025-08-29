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
  });
}

export async function searchAssets(params: any) {
  // Minimal: let caller pass tokenType, ownerAddress, compressed, page/limit, sortBy, etc.
  return heliusRpc<DasListResponse>("searchAssets", params);
}
