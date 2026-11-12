import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Только renderer, без Electron: `npm run dev:web`.
 * Нужен для быстрого просмотра интерфейса в браузере (см. README).
 */
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  server: {
    port: 5180
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  plugins: [react()]
})
