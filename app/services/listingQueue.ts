// Rate-limited queue for checking NFT listings
// Magic Eden API limit: 120 TPM (2 requests per second)

interface QueuedRequest {
  mint: string;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class ListingQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly MIN_DELAY = 600; // 600ms between requests (safer than 500ms)
  private readonly MAX_RETRIES = 2;
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds cache

  async checkListing(mint: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(mint);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        mint,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      // Skip old requests (older than 30 seconds)
      if (Date.now() - request.timestamp > 30000) {
        request.reject(new Error('Request timeout'));
        continue;
      }

      try {
        // Rate limiting: ensure minimum delay between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_DELAY) {
          await new Promise(resolve => setTimeout(resolve, this.MIN_DELAY - timeSinceLastRequest));
        }

        const result = await this.fetchListing(request.mint);
        
        // Cache the result
        this.cache.set(request.mint, {
          data: result,
          timestamp: Date.now()
        });

        request.resolve(result);
        this.lastRequestTime = Date.now();

      } catch (error) {
        console.error(`Failed to check listing for ${request.mint}:`, error);
        request.reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    }

    this.processing = false;
  }

  private async fetchListing(mint: string, retries = 0): Promise<any> {
    try {
      const response = await fetch('/api/agent-tools/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mint })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      if (retries < this.MAX_RETRIES) {
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchListing(mint, retries + 1);
      }
      throw error;
    }
  }

  // Clean up old cache entries
  private cleanCache() {
    const now = Date.now();
    for (const [mint, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(mint);
      }
    }
  }

  // Get queue status for debugging
  getStatus() {
    this.cleanCache();
    return {
      queueLength: this.queue.length,
      cacheSize: this.cache.size,
      processing: this.processing,
      lastRequestTime: this.lastRequestTime
    };
  }

  // Clear cache when new search is performed
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
const listingQueue = new ListingQueue();

// Initialize cleanup timer only on client side
if (typeof window !== 'undefined') {
  // Clean cache every 60 seconds
  setInterval(() => {
    listingQueue['cleanCache']();
  }, 60000);
}

export default listingQueue;
