import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupabaseAuthProvider } from './hooks/useSupabaseAuth';
import { bootstrapServices } from './services/bootstrap';
import App from './App';

// 🚨 CRITICAL FIX: Initialize service layer
console.log('🔧 Initializing service layer...');
bootstrapServices();
console.log('✅ Service layer initialized');

// Create QueryClient 
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

root.render(
  <SupabaseAuthProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </SupabaseAuthProvider>
);