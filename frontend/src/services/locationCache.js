/**
 * In-memory Location Cache to eliminate repeated API requests.
 * Caches searched locations, geocoding results, and cascading dropdown responses.
 */

class LocationCache {
  constructor() {
    this.cache = new Map();
    this.searchCache = new Map();
    this.dropdownCache = new Map();
    this.maxSize = 150;
  }

  // Generic key lookup
  get(key) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp < 1000 * 60 * 30) { // 30 minutes TTL
        return entry.data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Cascading dropdown cache
  getDropdown(level, params) {
    const key = `${level}:${JSON.stringify(params)}`;
    return this.dropdownCache.get(key) || null;
  }

  setDropdown(level, params, options) {
    const key = `${level}:${JSON.stringify(params)}`;
    this.dropdownCache.set(key, options);
  }

  // Search query cache
  getSearch(query) {
    const q = query.trim().toLowerCase();
    return this.searchCache.get(q) || null;
  }

  setSearch(query, results) {
    const q = query.trim().toLowerCase();
    this.searchCache.set(q, results);
  }

  clear() {
    this.cache.clear();
    this.searchCache.clear();
    this.dropdownCache.clear();
  }
}

export const locationCache = new LocationCache();
