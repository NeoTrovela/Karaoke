import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const certPath = path.resolve(rootDir, '../certs/cert.pem')
const keyPath = path.resolve(rootDir, '../certs/key.pem')
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // Phones need a secure context for getUserMedia; run `npm run setup:https`
    // once to generate a local cert, otherwise this falls back to plain HTTP
    // (fine for host-only testing on localhost, but phones won't be able to
    // capture mic audio over bare LAN HTTP).
    https: hasCerts
      ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
      : undefined,
    // Proxy Socket.io to the backend so it shares this page's origin/port.
    // Phones only ever get one self-signed-cert warning to accept (this
    // origin) — a direct connection to the backend's own port would be a
    // second origin, and browsers never offer a click-through for untrusted
    // certs on background WebSocket/XHR requests, only page navigations.
    proxy: {
      '/socket.io': {
        target: `${hasCerts ? 'https' : 'http'}://localhost:3001`,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
