import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
    plugins: [react()],
    server: {
        https: {
            key: fs.readFileSync('C:\Users/artur/localhost+2-key.pem'),
            cert: fs.readFileSync('C:\Users/artur/localhost+2.pem')
        },
        port: 443,
        open: true,
        proxy: {
            '/api': {
                target: 'https://api.cloudbeds.com',
                changeOrigin: true,
                secure: false,
                ws: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: true
    }
})