import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The version people see comes from package.json; the build id changes with every build, so an open app
// can tell that a newer copy has been deployed even when the version number stayed the same.
const VERSION: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
const BUILD = `${VERSION}-${Date.now().toString(36)}`

/** Writes dist/version.json, which the running app polls to notice an update (src/lib/version.ts). */
function versionFile(): Plugin {
  return {
    name: 'manna-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: VERSION, build: BUILD }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
    __APP_BUILD__: JSON.stringify(BUILD),
  },
  // Might uses 5180; Manna takes the next port so both can run at once. Must match site_url in supabase/config.toml
  server: { port: 5181, strictPort: true },
  // the receipt reader is only imported when a photo arrives; bundle it at startup so that first import
  // doesn't race the dev server preparing it ("Failed to fetch dynamically imported module")
  optimizeDeps: { include: ['tesseract.js'] },
  preview: { port: 5181, strictPort: true },
})
