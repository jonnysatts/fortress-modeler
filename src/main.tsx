import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

console.log('main.tsx starting...');

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
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

console.log('App rendered!');
