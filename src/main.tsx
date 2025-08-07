import { createRoot } from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupabaseAuthProvider } from './hooks/useSupabaseAuth';
import { bootstrapServices } from './services/bootstrap';
import App from './App';
import './lib/debug-env'; // Debug environment variables

// 🚨 CRITICAL FIX: Initialize service layer
console.log('🔧 Initializing service layer...');
try {
  bootstrapServices();
  console.log('✅ Service layer initialized');
} catch (error) {
  console.error('❌ Service layer initialization failed:', error);
  // Continue anyway to show the app
}

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

try {
  root.render(
    <SupabaseAuthProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </SupabaseAuthProvider>
  );
  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('❌ React rendering failed:', error);
  // Show a basic error message
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial; color: red;">
      <h1>App Loading Error</h1>
      <p>The application failed to load. Check the browser console for details.</p>
      <pre>${error.message}</pre>
    </div>
  `;
}