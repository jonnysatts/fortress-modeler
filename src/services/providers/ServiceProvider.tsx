import React, { createContext, useContext, ReactNode } from 'react';
import { serviceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { IStorageService } from '../interfaces/IStorageService';
import { IErrorService } from '../interfaces/IErrorService';
import { ILogService } from '../interfaces/ILogService';
import { IConfigService } from '../interfaces/IConfigService';

// Service context types
interface ServiceContextType {
  storageService: IStorageService;
  errorService: IErrorService;
  logService: ILogService;
  configService: IConfigService;
}

// Create the service context
const ServiceContext = createContext<ServiceContextType | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
}

/**
 * React Context provider for dependency injection
 * Provides access to all registered services throughout the component tree
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  // Resolve services from the container
  const services: ServiceContextType = {
    storageService: serviceContainer.resolve<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE),
    errorService: serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE),
    logService: serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE),
    configService: serviceContainer.resolve<IConfigService>(SERVICE_TOKENS.CONFIG_SERVICE),
  };

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Hook to access the storage service
 */
export const useStorageService = (): IStorageService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useStorageService must be used within a ServiceProvider');
  }
  return context.storageService;
};

/**
 * Hook to access the error service
 */
export const useErrorService = (): IErrorService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useErrorService must be used within a ServiceProvider');
  }
  return context.errorService;
};

/**
 * Hook to access the log service
 */
export const useLogService = (): ILogService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useLogService must be used within a ServiceProvider');
  }
  return context.logService;
};

/**
 * Hook to access the config service
 */
export const useConfigService = (): IConfigService => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useConfigService must be used within a ServiceProvider');
  }
  return context.configService;
};

/**
 * Hook to access all services at once
 */
export const useServices = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};