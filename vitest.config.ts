import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': path.resolve(
        dirname,
        'src/test-support/cloudflare-workers.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
  },
})
