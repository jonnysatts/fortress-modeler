import { serviceContainer, SERVICE_TOKENS } from './container/ServiceContainer';
import { DexieStorageService } from './implementations/DexieStorageService';
import { ErrorService } from './implementations/ErrorService';
import { LogService } from './implementations/LogService';
import { ConfigService } from './implementations/ConfigService';

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

  // Register storage service
  serviceContainer.register(
    SERVICE_TOKENS.STORAGE_SERVICE,
    () => new DexieStorageService(),
    true
  );

  // Log successful bootstrap
  const logService = serviceContainer.resolve(SERVICE_TOKENS.LOG_SERVICE);
  logService.info('Application services bootstrapped successfully', {
    environment: configService.getEnvironment(),
    services: Object.values(SERVICE_TOKENS),
  });
}

/**
 * Get the current service container (useful for testing)
 */
export function getServiceContainer() {
  return serviceContainer;
}