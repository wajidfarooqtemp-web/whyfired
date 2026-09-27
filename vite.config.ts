import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The app shell (HTML/JS/CSS) is precached so the app opens
      // instantly even with no connection at all — this is what lets
      // the Android wrapper (Capacitor, pointed at the live site)
      // show something immediately instead of a blank/error screen
      // on a slow or dropped connection.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Approved-case reads (feed, featured cases, a single
            // case) via Supabase's REST endpoint: show the last
            // cached copy immediately, then refresh it in the
            // background. Never used for POST/PATCH/DELETE — those
            // always need a live network round trip, so this only
            // matches GET.
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/rest/v1/') &&
              request.method === 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'whyfired-case-data',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Why Fired',
        short_name: 'WhyFired',
        theme_color: '#2b1210',
        background_color: '#2b1210',
        display: 'standalone',
        icons: [
          // purpose 'any maskable' tells Android/Chrome it's safe to
          // crop these into a circle, squircle, or rounded square —
          // the OS does the cropping at install time, using whatever
          // shape that phone's launcher uses. The logo already sits
          // well inside the safe zone (see assets/ generation notes),
          // so it won't get clipped when that happens.
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})