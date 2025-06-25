import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          
          // UI libraries
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-toast'
          ],
          
          // Chart libraries
          charts: ['recharts'],
          
          // Database and state
          database: ['dexie'],
          state: ['zustand', '@tanstack/react-query'],
          
          // Form handling
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Utilities
          utils: ['date-fns', 'lucide-react', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development'
  }
}));
