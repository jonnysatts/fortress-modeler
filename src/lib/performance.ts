/**
 * Performance monitoring utility for tracking application metrics
 * Provides insights into render times, API calls, and user interactions
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceEntry {
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeTimers: Map<string, PerformanceEntry> = new Map();
  private readonly maxMetrics = 1000;
  private readonly enabled = process.env.NODE_ENV === 'development';

  /**
   * Start timing an operation
   */
  startTimer(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    this.activeTimers.set(name, {
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End timing an operation and record the metric
   */
  endTimer(name: string): number | null {
    if (!this.enabled) return null;
    
    const timer = this.activeTimers.get(name);
    if (!timer) {
      console.warn(`Performance timer '${name}' was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: timer.metadata
    });

    this.activeTimers.delete(name);
    return duration;
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Keep metrics array from growing too large
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Measure component render time
   */
  measureComponentRender(componentName: string): () => void {
    const timerId = `component:${componentName}`;
    this.startTimer(timerId, { component: componentName });
    
    return () => {
      this.endTimer(timerId);
    };
  }

  /**
   * Measure database query time
   */
  async measureDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) return queryFn();

    const timerId = `db:${queryName}`;
    this.startTimer(timerId, { query: queryName });

    try {
      const result = await queryFn();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Measure API call time
   */
  async measureApiCall<T>(
    endpoint: string,
    callFn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) return callFn();

    const timerId = `api:${endpoint}`;
    this.startTimer(timerId, { endpoint });

    try {
      const result = await callFn();
      this.endTimer(timerId);
      return result;
    } catch (error) {
      this.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Track bundle size metrics
   */
  trackBundleSize(chunkName: string, size: number): void {
    this.recordMetric({
      name: `bundle:${chunkName}`,
      value: size,
      unit: 'bytes',
      timestamp: Date.now(),
      metadata: { chunk: chunkName }
    });
  }

  /**
   * Get performance report
   */
  getReport(filterName?: string): {
    metrics: PerformanceMetric[];
    summary: {
      avgDuration: number;
      maxDuration: number;
      minDuration: number;
      count: number;
    };
  } {
    const filtered = filterName
      ? this.metrics.filter(m => m.name.includes(filterName))
      : this.metrics;

    const durations = filtered
      .filter(m => m.unit === 'ms')
      .map(m => m.value);

    const summary = {
      avgDuration: durations.length
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      maxDuration: durations.length ? Math.max(...durations) : 0,
      minDuration: durations.length ? Math.min(...durations) : 0,
      count: filtered.length
    };

    return { metrics: filtered, summary };
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.unit === 'ms')
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for measuring component performance
export const usePerformanceTimer = (componentName: string) => {
  if (process.env.NODE_ENV !== 'development') {
    return { startTimer: () => {}, endTimer: () => {} };
  }

  return {
    startTimer: (operation: string) => {
      performanceMonitor.startTimer(`${componentName}:${operation}`);
    },
    endTimer: (operation: string) => {
      performanceMonitor.endTimer(`${componentName}:${operation}`);
    }
  };
};

// Note: HOC implementation would need React import to work properly
// For now, this is exported for future use when needed

// Log performance metrics to console (dev only)
if (process.env.NODE_ENV === 'development') {
  // Log performance report every 30 seconds
  setInterval(() => {
    const report = performanceMonitor.getReport();
    if (report.metrics.length > 0) {
      console.group('📊 Performance Report');
      console.log('Summary:', report.summary);
      console.log('Slowest Operations:', performanceMonitor.getSlowestOperations(5));
      console.groupEnd();
    }
  }, 30000);
}