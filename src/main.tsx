import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

console.log('main.tsx starting...');

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Root element not found. Please ensure the HTML file contains a div with id='root'.");
}

console.log('Root element found, creating React root...');

// Start React immediately - the App component will handle loading states
const root = createRoot(rootElement);
console.log('React root created, rendering app...');

root.render(
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </QueryClientProvider>
);

console.log('App rendered!');
