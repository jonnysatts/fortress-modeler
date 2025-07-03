import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8081,
    open: true, // Automatically open browser
    strictPort: true, // Fail if port 8081 is not available
  },
  plugins: [
    react(),
    // Bundle analyzer - generates bundle-analysis.html
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // Gzip compression for production
    ...(mode === 'production' ? [
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        compressionOptions: { level: 9 },
        deleteOriginFile: false,
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        compressionOptions: { level: 11 },
        deleteOriginFile: false,
      })
    ] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Third-party vendor libraries
          if (id.includes('node_modules')) {
            // Large libraries get their own chunks
            if (id.includes('recharts')) return 'charts';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('dexie')) return 'database';
            if (id.includes('@tanstack/react-query')) return 'react-query';
            if (id.includes('zustand')) return 'state';
            
            // Group Radix UI components
            if (id.includes('@radix-ui')) return 'radix-ui';
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'forms';
            }
            
            // Core React libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            
            // Utility libraries
            if (id.includes('date-fns') || id.includes('lucide-react') || 
                id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            
            // Everything else goes to vendor
            return 'vendor';
          }
          
          // Application code chunking
          if (id.includes('src/components/ui/')) return 'ui-components';
          if (id.includes('src/components/models/')) return 'model-components';
          if (id.includes('src/pages/')) return 'pages';
          if (id.includes('src/hooks/')) return 'hooks';
          if (id.includes('src/lib/')) return 'lib';
          if (id.includes('src/services/')) return 'services';
        },
        // Optimize chunk naming for better caching
        chunkFileNames: mode === 'production' ? 'assets/[name]-[hash].js' : 'assets/[name].js',
        entryFileNames: mode === 'production' ? 'assets/[name]-[hash].js' : 'assets/[name].js',
        assetFileNames: mode === 'production' ? 'assets/[name]-[hash][extname]' : 'assets/[name][extname]',
      }
    },
    chunkSizeWarningLimit: 800,
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    target: 'es2020',
    // Asset optimization
    assetsInlineLimit: 4096, // Assets < 4kb will be inlined as base64
    cssCodeSplit: true, // Enable CSS code splitting
  }
}));
