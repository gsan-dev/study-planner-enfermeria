import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Sustituye __BUILD_ID__ en dist/service-worker.js por un identificador único
 * en cada build. Así cada despliegue instala un service worker nuevo que
 * limpia las cachés de la versión anterior.
 */
function serviceWorkerBuildId(): Plugin {
  let outDir = 'dist'
  return {
    name: 'service-worker-build-id',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const file = resolve(outDir, 'service-worker.js')
      const source = await readFile(file, 'utf8')
      await writeFile(file, source.replaceAll('__BUILD_ID__', Date.now().toString(36)))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), serviceWorkerBuildId()],
    server: {
      host: true,
      port: 5173,
      // En Docker sobre Windows/macOS los eventos de cambio no siempre llegan al contenedor.
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
      // En desarrollo, /api se redirige al backend (evita CORS y replica producción).
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
  }
})
