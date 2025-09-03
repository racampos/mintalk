/**
 * In-memory cache for Magic Eden listing data
 * Reduces duplicate API calls between UI PriceBadges and voice tutor
 */

interface ListingData {
  listings: Array<{
    id: string;
    price: number;
    priceLamports: number;
    seller: string;
    marketplace: string;
    tokenMint: string;
    tokenAddress: string;
    auctionHouse: string;
    expiry: number;
  }>;
  count: number;
  mint: string;
}

interface CacheEntry {
  data: ListingData;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ListingCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get cached listing data for a mint
   */
  get(mint: string): ListingData | null {
    const entry = this.cache.get(mint);
    
    if (!entry) {
      console.log(`📭 [Cache] Miss for mint: ${mint.substring(0, 8)}...`);
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      console.log(`⏰ [Cache] Expired entry for mint: ${mint.substring(0, 8)}... (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
      this.cache.delete(mint);
      return null;
    }

    console.log(`✅ [Cache] Hit for mint: ${mint.substring(0, 8)}... (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
    return entry.data;
  }

  /**
   * Store listing data in cache
   */
  set(mint: string, data: ListingData, ttl?: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };
    
    this.cache.set(mint, entry);
    console.log(`💾 [Cache] Stored data for mint: ${mint.substring(0, 8)}... (TTL: ${Math.round(entry.ttl / 60000)}min)`);
  }

  /**
   * Get multiple mints from cache, return cache hits and misses
   */
  getMultiple(mints: string[]): { 
    hits: Record<string, ListingData>; 
    misses: string[]; 
  } {
    const hits: Record<string, ListingData> = {};
    const misses: string[] = [];

    for (const mint of mints) {
      const data = this.get(mint);
      if (data) {
        hits[mint] = data;
      } else {
        misses.push(mint);
      }
    }

    console.log(`🎯 [Cache] Batch lookup: ${Object.keys(hits).length} hits, ${misses.length} misses`);
    return { hits, misses };
  }

  /**
   * Store multiple entries
   */
  setMultiple(entries: Record<string, ListingData>, ttl?: number): void {
    const count = Object.keys(entries).length;
    for (const [mint, data] of Object.entries(entries)) {
      this.set(mint, data, ttl);
    }
    console.log(`💾 [Cache] Batch stored ${count} entries`);
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [mint, entry] of Array.from(this.cache.entries())) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(mint);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [Cache] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{
      mint: string;
      age: number;
      ttl: number;
      listingCount: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([mint, entry]) => ({
      mint: mint.substring(0, 8) + '...',
      age: Math.round((now - entry.timestamp) / 1000), // seconds
      ttl: Math.round(entry.ttl / 1000), // seconds
      listingCount: entry.data.listings.length
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [Cache] Cleared all ${size} entries`);
  }
}

// Single instance for the entire app
const listingCache = new ListingCache();

// Clean expired entries every 5 minutes
setInterval(() => {
  listingCache.cleanExpired();
}, 5 * 60 * 1000);

export default listingCache;
export type { ListingData };
