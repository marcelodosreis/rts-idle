import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const developmentPort = Number(process.env.VITE_DEV_PORT ?? '5173')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: process.env.HOST,
    port: developmentPort,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@rts/simulation/fixtures': resolve(__dirname, '../../packages/simulation/src/determinism-fixture.ts'),
      '@rts/renderer': resolve(__dirname, '../../packages/renderer/src/index.ts'),
      '@rts/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@rts/protocol': resolve(__dirname, '../../packages/protocol/src/index.ts'),
      '@rts/simulation': resolve(__dirname, '../../packages/simulation/src/index.ts')
    }
  }
})
