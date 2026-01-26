import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 🟢 CAMBIO: Incluimos tu favicon.svg en la caché
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'], 
      manifest: {
        name: 'ALERIS.ops - Gestión de Academias',
        short_name: 'ALERIS.ops',
        description: 'Sistema operativo para gestión de academias y staff.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          // 🟢 CAMBIO: Usamos el mismo SVG para todos los tamaños.
          // El navegador lo escalará. Es vital poner el tipo correcto.
          {
            src: '/pwa-icon.svg', // Asegúrate que este archivo exista en public/
            sizes: 'any', // 'any' indica que es escalable (vectorial)
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-icon.svg', // Lo repetimos para propósito 'maskable'
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable' // Para iconos redondos en Android
          },
          // NOTA: Si decidieras crear el PNG de 512px, lo agregarías aquí así:
          /*
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
          */
        ]
      }
    })
  ]
})