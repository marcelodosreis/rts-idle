import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@rts/simulation/fixtures': resolve(__dirname, '../../packages/simulation/src/determinism-fixture.ts'),
      '@rts/renderer': resolve(__dirname, '../../packages/renderer/src/index.ts'),
      '@rts/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@rts/protocol': resolve(__dirname, '../../packages/protocol/src/index.ts'),
      '@rts/simulation': resolve(__dirname, '../../packages/simulation/src/index.ts')
    }
  }
})
