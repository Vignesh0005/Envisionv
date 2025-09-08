import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react(),
    ],
    base: './', // Use relative paths for production
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'terser', // Use terser for better minification
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.logs in production
                drop_debugger: true,
            },
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    ui: ['@mui/material', '@emotion/react', '@emotion/styled', 'antd'],
                },
            },
        },
        chunkSizeWarningLimit: 1000, // Increase warning limit for chunk size
        sourcemap: false, // Disable sourcemaps in production
    },
    server: {
        port: 3000,
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
    },
});
