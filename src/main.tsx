import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { bootstrapServices, ServiceProvider, serviceContainer, SERVICE_TOKENS } from './services';
import { globalErrorHandler } from './services/implementations/GlobalErrorHandler';

// Bootstrap dependency injection services
bootstrapServices();

// Initialize global error handlers
globalErrorHandler.initialize();

// Create QueryClient with error handling integration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const errorService = serviceContainer.resolve(SERVICE_TOKENS.ERROR_SERVICE);
        // Use our error service to determine if we should retry
        return failureCount < 3 && errorService.shouldRetry(error);
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      onError: (error) => {
        const errorService = serviceContainer.resolve(SERVICE_TOKENS.ERROR_SERVICE);
        errorService.logError(error, 'React Query', 'network', 'medium');
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        const errorService = serviceContainer.resolve(SERVICE_TOKENS.ERROR_SERVICE);
        return failureCount < 2 && errorService.shouldRetry(error);
      },
      onError: (error) => {
        const errorService = serviceContainer.resolve(SERVICE_TOKENS.ERROR_SERVICE);
        errorService.logError(error, 'React Query Mutation', 'network', 'medium');
      },
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Root element not found. Please ensure the HTML file contains a div with id='root'.");
}

// Start React immediately - the App component will handle loading states
const root = createRoot(rootElement);

root.render(
  <ServiceProvider>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </ServiceProvider>
);
