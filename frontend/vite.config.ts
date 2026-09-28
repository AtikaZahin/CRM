import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Phase 10.1: service worker so the app opens without internet
// (after at least one online visit). It caches ONLY the app's own files and
// Google Fonts – never API responses or tokens (those live in IndexedDB, per account).
export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            manifest: {
                name: 'Capstone CRM',
                short_name: 'CRM',
                description: 'Capstone CRM – staff and customer support portal',
                theme_color: '#d98d7e',
                background_color: '#fbf7f2',
                display: 'standalone',
                start_url: '/',
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
                // Deep links such as /staff/support load index.html offline
                navigateFallback: '/index.html',
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts',
                            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
    preview: {
        port: 5173,
        strictPort: true,
    },

});