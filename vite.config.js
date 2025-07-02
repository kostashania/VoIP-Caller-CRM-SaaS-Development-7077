import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-hot-toast', 'react-hook-form'],
          icons: ['react-icons']
        }
      }
    },
    // Ensure all dependencies are properly externalized for SSR
    ssr: false,
    target: 'es2015'
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-icons',
      'framer-motion',
      'react-hot-toast',
      'react-hook-form',
      'zustand',
      'date-fns',
      '@supabase/supabase-js'
    ]
  }
});