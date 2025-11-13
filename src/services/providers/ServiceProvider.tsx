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
  const [services, setServices] = React.useState<ServiceContextType | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      // Resolve services from the container with error handling
      const resolvedServices: ServiceContextType = {
        storageService: serviceContainer.resolve<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE),
        errorService: serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE),
        logService: serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE),
        configService: serviceContainer.resolve<IConfigService>(SERVICE_TOKENS.CONFIG_SERVICE),
      };
      
      setServices(resolvedServices);
      console.log('✅ Services resolved successfully');
    } catch (error) {
      console.error('❌ Failed to resolve services:', error);
      setError(error instanceof Error ? error.message : 'Unknown service resolution error');
    }
  }, []);

  // Show error state if service resolution failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow-lg border border-red-200">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">⚠️ Service Initialization Error</div>
            <p className="text-gray-700 mb-4">
              The application failed to initialize properly. This is likely due to a configuration issue.
            </p>
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-gray-600 mb-2">Technical Details</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{error}</pre>
            </details>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while services are being resolved
  if (!services) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing services...</p>
        </div>
      </div>
    );
  }

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