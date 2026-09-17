import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true
  },
  resolve: {
    alias: {
      '@rts/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@rts/game-data': resolve(__dirname, 'packages/game-data/src/index.ts'),
      '@rts/pathfinding': resolve(__dirname, 'packages/pathfinding/src/index.ts'),
      '@rts/simulation/contracts': resolve(__dirname, 'packages/simulation/src/contracts/index.ts'),
      '@rts/simulation/fixtures': resolve(__dirname, 'packages/simulation/src/determinism-fixture.ts'),
      '@rts/simulation': resolve(__dirname, 'packages/simulation/src/index.ts'),
      '@rts/protocol': resolve(__dirname, 'packages/protocol/src/index.ts'),
      '@rts/ai': resolve(__dirname, 'packages/ai/src/index.ts'),
      '@rts/renderer': resolve(__dirname, 'packages/renderer/src/index.ts'),
      '@rts/audio': resolve(__dirname, 'packages/audio/src/index.ts'),
      '@rts/server': resolve(__dirname, 'apps/server/src/index.ts')
    }
  }
})
