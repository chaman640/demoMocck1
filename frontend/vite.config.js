import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ─────────────────────────────────────────────
  // 🐛 BADA FIX: DEV MODE MEIN API PROXY
  //
  // src/api/api.js ka baseURL "/api" hai. Production mein Express khud
  // frontend/dist serve karta hai, isliye "/api" same origin pe chala jata hai.
  //
  // Lekin `npm run dev` mein frontend 5173 pe chalta hai aur backend 5000 pe.
  // Proxy ke bina "/api/teacher-login" Vite dev server ko jata tha (jahan koi
  // API hai hi nahi) → 404 / "Unexpected token '<'" wala JSON parse error.
  // Isi wajah se local mein teacher signup/login "kaam nahi kar raha" lagta tha.
  //
  // Ab dev server saari /api requests backend pe forward kar deta hai,
  // aur browser ke liye sab same-origin rehta hai → cookies bhi theek chalti hain.
  // ─────────────────────────────────────────────
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
