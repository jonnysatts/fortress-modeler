import { serviceContainer, SERVICE_TOKENS } from './container/ServiceContainer';
import { DexieStorageService } from './implementations/DexieStorageService';
import { SupabaseStorageService } from './implementations/SupabaseStorageService';
import { SupabaseRealtimeService } from './implementations/SupabaseRealtimeService';
import { ErrorService } from './implementations/ErrorService';
import { LogService } from './implementations/LogService';
import { ConfigService } from './implementations/ConfigService';
import { isCloudModeEnabled } from '@/config/app.config';

/**
 * Bootstrap and configure all application services
 * This should be called once at application startup
 */
export function bootstrapServices(): void {
  // Create and register config service first (other services may depend on it)
  const configService = new ConfigService();
  serviceContainer.registerInstance(SERVICE_TOKENS.CONFIG_SERVICE, configService);

  // Register log service with appropriate level based on environment
  const logLevel = configService.isDevelopment() ? 'debug' : 'info';
  serviceContainer.register(
    SERVICE_TOKENS.LOG_SERVICE,
    () => new LogService(logLevel),
    true
  );

  // Register error service
  serviceContainer.register(
    SERVICE_TOKENS.ERROR_SERVICE,
    () => new ErrorService(),
    true
  );

  // Register storage service based on configuration
  const useSupabase = isCloudModeEnabled();

  const logService = serviceContainer.resolve(SERVICE_TOKENS.LOG_SERVICE);

  if (useSupabase) {
    // Register Supabase implementation
    serviceContainer.register(
      SERVICE_TOKENS.STORAGE_SERVICE,
      () => new SupabaseStorageService(),
      true
    );
    logService.info('Using Supabase backend for storage');
  } else {
    // Register Dexie implementation (current default)
    serviceContainer.register(
      SERVICE_TOKENS.STORAGE_SERVICE,
      () => new DexieStorageService(),
      true
    );
    logService.info('Using Dexie (local) backend for storage');
  }

  // Register real-time service (only available with Supabase)
  if (useSupabase) {
    serviceContainer.register(
      SERVICE_TOKENS.REALTIME_SERVICE,
      () => new SupabaseRealtimeService(),
      true
    );
    logService.info('Real-time service registered');
  }

  // Log successful bootstrap
  logService.info('Application services bootstrapped successfully', {
    environment: configService.getEnvironment(),
    storageBackend: useSupabase ? 'supabase' : 'dexie',
    realtimeEnabled: useSupabase,
    services: Object.values(SERVICE_TOKENS),
  });
}

/**
 * Get the current service container (useful for testing)
 */
export function getServiceContainer() {
  return serviceContainer;
}