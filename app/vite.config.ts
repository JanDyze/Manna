import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Might uses 5180; Manna takes the next port so both can run at once. Must match site_url in supabase/config.toml
  server: { port: 5181, strictPort: true },
  preview: { port: 5181, strictPort: true },
})
