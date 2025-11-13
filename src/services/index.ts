// Service Interfaces
export type { IStorageService } from './interfaces/IStorageService';
export type { IErrorService, ErrorSeverity, ErrorCategory, ErrorContext } from './interfaces/IErrorService';
export type { ILogService, LogLevel } from './interfaces/ILogService';
export type { IConfigService } from './interfaces/IConfigService';

// Service Implementations
export { DexieStorageService } from './implementations/DexieStorageService';
export { ErrorService } from './implementations/ErrorService';
export { LogService } from './implementations/LogService';
export { ConfigService } from './implementations/ConfigService';
export { GlobalErrorHandler, globalErrorHandler } from './implementations/GlobalErrorHandler';
export { ErrorRecoveryService, errorRecoveryService } from './implementations/ErrorRecoveryService';

// Dependency Injection
export { ServiceContainer, SERVICE_TOKENS, serviceContainer } from './container/ServiceContainer';
export {
  ServiceProvider,
  useStorageService,
  useErrorService,
  useLogService,
  useConfigService,
  useServices,
} from './providers/ServiceProvider';

// Bootstrap
export { bootstrapServices, getServiceContainer } from './bootstrap';