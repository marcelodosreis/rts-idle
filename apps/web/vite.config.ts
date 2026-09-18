import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

/**
 * The sprite lab lives at `/sprites/` (a directory entry). Vite's MPA mode
 * does not auto-redirect the slash-less form, so `/sprites` would 404 — and
 * the SPA fallback (default appType) would serve the game. Redirect it.
 */
function spriteLabDirectoryRedirect(): Plugin {
  const redirect = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const [path, query = ''] = (req.url ?? '').split('?')
    if (path === '/sprites') {
      res.writeHead(301, { location: `/sprites/${query ? `?${query}` : ''}` })
      res.end()
      return
    }
    next()
  }
  return {
    name: 'sprite-lab-directory-redirect',
    configureServer(server) {
      server.middlewares.use(redirect)
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect)
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spriteLabDirectoryRedirect()],
  // Multi-page app: without this, Vite's default SPA history fallback serves
  // the game's index.html for unknown paths, so `/sprites` (no trailing slash)
  // showed the game instead of the sprite lab.
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        det: resolve(__dirname, 'det.html'),
        perf: resolve(__dirname, 'perf.html'),
        sprites: resolve(__dirname, 'sprites/index.html')
      }
    }
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
