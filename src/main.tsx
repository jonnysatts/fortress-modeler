import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
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
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </QueryClientProvider>
);
