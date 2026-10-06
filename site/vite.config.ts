import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Em desenvolvimento, /api vai para a API do Hub (pedido de orçamento e contato).
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:3100'

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: true,
    port: 5175,
    proxy: { '/api': { target, changeOrigin: true } },
  },
})
