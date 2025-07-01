/**
 * Simple dependency injection container
 * Manages service registration and resolution
 */
export class ServiceContainer {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  /**
   * Register a service with the container
   */
  register<T>(token: string, implementation: () => T, singleton: boolean = true): void {
    this.services.set(token, { factory: implementation, singleton });
  }

  /**
   * Register a singleton service instance
   */
  registerInstance<T>(token: string, instance: T): void {
    this.singletons.set(token, instance);
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: string): T {
    // Check if we have a singleton instance
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    // Check if we have a registered service
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service '${token}' is not registered`);
    }

    const instance = service.factory();

    // Store singleton instances
    if (service.singleton) {
      this.singletons.set(token, instance);
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token) || this.singletons.has(token);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}

// Service tokens
export const SERVICE_TOKENS = {
  STORAGE_SERVICE: 'IStorageService',
  ERROR_SERVICE: 'IErrorService',
  LOG_SERVICE: 'ILogService',
  CONFIG_SERVICE: 'IConfigService',
  REALTIME_SERVICE: 'IRealtimeService',
} as const;

// Global container instance
export const serviceContainer = new ServiceContainer();