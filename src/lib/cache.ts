/**
 * Simple in-memory cache for database query results and expensive calculations
 * This improves performance by avoiding redundant computations
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 1000; // Maximum number of cache entries

  /**
   * Get value from cache if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache entries matching a pattern
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cache = new MemoryCache();

// Cache key generators for consistent naming
export const cacheKeys = {
  // Project related
  project: (id: string) => `project:${id}`,
  projectModels: (projectId: string) => `project:${projectId}:models`,
  projectActuals: (projectId: string) => `project:${projectId}:actuals`,
  
  // Model related
  model: (id: string) => `model:${id}`,
  modelProjections: (modelId: string, periods: number) => `model:${modelId}:projections:${periods}`,
  modelAnalysis: (modelId: string) => `model:${modelId}:analysis`,
  
  // Trend data (expensive calculations)
  revenueTrends: (modelId: string, timePoints: number) => `trends:revenue:${modelId}:${timePoints}`,
  costTrends: (modelId: string, timePoints: number) => `trends:cost:${modelId}:${timePoints}`,
  combinedFinancial: (modelId: string) => `financial:combined:${modelId}`,
  
  // Financial calculations
  financialMetrics: (modelId: string, periods: number, discountRate: number) => 
    `metrics:${modelId}:${periods}:${discountRate}`,
  breakdownData: (modelId: string, weekIndex: number) => `breakdown:${modelId}:${weekIndex}`,
};

// Cache helper functions
export const cacheHelpers = {
  /**
   * Wrap a function with caching
   */
  cached: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    getCacheKey: (...args: Parameters<T>) => string,
    ttlMs: number = 5 * 60 * 1000
  ) => {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      const key = getCacheKey(...args);
      
      // Try to get from cache first
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }
      
      // Execute function and cache result
      const result = await fn(...args);
      cache.set(key, result, ttlMs);
      
      return result;
    };
  },

  /**
   * Invalidate cache entries when data changes
   */
  invalidateProject: (projectId: string) => {
    cache.deletePattern(`project:${projectId}`);
    cache.deletePattern(`trends:.*:.*:.*`); // Invalidate all trends as they might depend on this project
  },

  invalidateModel: (modelId: string, projectId?: string) => {
    cache.delete(cacheKeys.model(modelId));
    cache.deletePattern(`model:${modelId}:.*`);
    cache.deletePattern(`trends:.*:${modelId}:.*`);
    cache.deletePattern(`financial:.*:${modelId}`);
    cache.deletePattern(`metrics:${modelId}:.*`);
    cache.deletePattern(`breakdown:${modelId}:.*`);
    
    if (projectId) {
      cache.delete(cacheKeys.projectModels(projectId));
    }
  },

  invalidateActuals: (projectId: string) => {
    cache.delete(cacheKeys.projectActuals(projectId));
    cache.deletePattern(`trends:.*:.*:.*`); // Trends depend on actuals data
  }
};