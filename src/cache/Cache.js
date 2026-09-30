/**
 * SD YT Live — In-Memory Cache & Request Deduplication
 * Stacks Development (SD)
 */

export class Cache {
  /**
   * @param {object} [options={}]
   * @param {boolean} [options.enabled=true]
   * @param {number} [options.ttl=30000] Default 30 seconds TTL
   */
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.defaultTTL = options.ttl ?? 30000;
    this.store = new Map();
    this.pendingRequests = new Map();

    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gets a cached result if valid and not expired.
   * 
   * @param {string} key 
   * @returns {object|null}
   */
  get(key) {
    if (!this.enabled) {
      this.misses++;
      return null;
    }

    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt < now) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Caches a value with TTL.
   * 
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttlMs] 
   */
  set(key, value, ttlMs = this.defaultTTL) {
    if (!this.enabled) return;
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Removes a specific key from cache.
   * 
   * @param {string} key 
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clears all cache entries and resets statistics.
   */
  clear() {
    this.store.clear();
    this.pendingRequests.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns cache statistics.
   * 
   * @returns {{ hits: number, misses: number, entries: number }}
   */
  stats() {
    // Purge expired items before reporting entries count
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }

    return {
      hits: this.hits,
      misses: this.misses,
      entries: this.store.size
    };
  }

  /**
   * Deduplicates concurrent pending async requests for the same key.
   * 
   * @param {string} key 
   * @param {function(): Promise<any>} executor 
   * @returns {Promise<any>}
   */
  async deduplicate(key, executor) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = (async () => {
      try {
        return await executor();
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export default Cache;
