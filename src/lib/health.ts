// Application health monitoring
import { db } from './db';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  latency?: number;
  timestamp: Date;
}

export class HealthMonitor {
  private static instance: HealthMonitor;
  private checks: Map<string, HealthCheck> = new Map();
  private checkInterval: number = 30000; // 30 seconds
  private intervalId?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  startMonitoring() {
    this.runHealthChecks();
    this.intervalId = setInterval(() => {
      this.runHealthChecks();
    }, this.checkInterval);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async runHealthChecks() {
    await Promise.allSettled([
      this.checkDatabase(),
      this.checkLocalStorage(),
      this.checkMemoryUsage(),
    ]);
  }

  private async checkDatabase(): Promise<void> {
    const start = Date.now();
    
    try {
      // Simple database connectivity test
      await db.projects.limit(1).toArray();
      
      const latency = Date.now() - start;
      this.updateCheck('database', {
        service: 'database',
        status: latency < 1000 ? 'healthy' : 'degraded',
        message: latency < 1000 ? 'Database responding normally' : 'Database response slow',
        latency,
        timestamp: new Date(),
      });
    } catch (error) {
      this.updateCheck('database', {
        service: 'database',
        status: 'unhealthy',
        message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  }

  private async checkLocalStorage(): Promise<void> {
    try {
      const testKey = '__health_check__';
      const testValue = Date.now().toString();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved === testValue) {
        this.updateCheck('localStorage', {
          service: 'localStorage',
          status: 'healthy',
          message: 'Local storage functioning normally',
          timestamp: new Date(),
        });
      } else {
        throw new Error('Local storage test failed');
      }
    } catch (error) {
      this.updateCheck('localStorage', {
        service: 'localStorage',
        status: 'unhealthy',
        message: `Local storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  }

  private async checkMemoryUsage(): Promise<void> {
    try {
      // Check if performance.memory is available (Chrome/Edge)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1048576;
        const totalMB = memory.totalJSHeapSize / 1048576;
        const usage = (usedMB / totalMB) * 100;
        
        this.updateCheck('memory', {
          service: 'memory',
          status: usage < 80 ? 'healthy' : usage < 90 ? 'degraded' : 'unhealthy',
          message: `Memory usage: ${usage.toFixed(1)}% (${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB)`,
          timestamp: new Date(),
        });
      } else {
        this.updateCheck('memory', {
          service: 'memory',
          status: 'healthy',
          message: 'Memory monitoring not available in this browser',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.updateCheck('memory', {
        service: 'memory',
        status: 'unhealthy',
        message: `Memory check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  }

  private updateCheck(service: string, check: HealthCheck) {
    this.checks.set(service, check);
    
    // Log unhealthy services
    if (check.status === 'unhealthy') {
      console.error(`Health check failed for ${service}:`, check.message);
    } else if (check.status === 'degraded') {
      console.warn(`Health check degraded for ${service}:`, check.message);
    }
  }

  getHealthStatus(): { overall: 'healthy' | 'degraded' | 'unhealthy'; checks: HealthCheck[] } {
    const checks = Array.from(this.checks.values());
    
    if (checks.length === 0) {
      return { overall: 'unhealthy', checks: [] };
    }
    
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasDegraded = checks.some(check => check.status === 'degraded');
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (hasUnhealthy) {
      overall = 'unhealthy';
    } else if (hasDegraded) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    return { overall, checks };
  }
}

export const healthMonitor = HealthMonitor.getInstance();