import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // Feature modules
            '@features': path.resolve(__dirname, './src/features'),
            '@auth': path.resolve(__dirname, './src/features/auth'),
            '@student': path.resolve(__dirname, './src/features/student'),
            '@teacher': path.resolve(__dirname, './src/features/teacher'),
            '@classroom': path.resolve(__dirname, './src/features/classroom'),
            '@study': path.resolve(__dirname, './src/features/study'),
            '@analytics': path.resolve(__dirname, './src/features/analytics'),
            '@gamification': path.resolve(__dirname, './src/features/gamification'),
            '@landing': path.resolve(__dirname, './src/features/landing'),
            // Shared infrastructure
            '@shared': path.resolve(__dirname, './src/shared'),
            '@components': path.resolve(__dirname, './src/shared/components'),
            '@utils': path.resolve(__dirname, './src/shared/utils'),
            '@config': path.resolve(__dirname, './src/shared/config'),
            // Legacy aliases (for backward compatibility during transition)
            '@contexts': path.resolve(__dirname, './src/features/auth/contexts'),
            '@assets': path.resolve(__dirname, './src/assets')
        }
    },
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
                    'ui-vendor': ['framer-motion', 'lucide-react']
                }
            }
        }
    }
})