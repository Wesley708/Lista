import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function securityCspPlugin(): Plugin {
  return {
    name: 'lista-compras-security-csp',
    transformIndexHtml(_html, ctx) {
      const isDev = Boolean(ctx.server);
      const scriptSrc = isDev
        ? "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://www.gstatic.com"
        : "script-src 'self' https://apis.google.com https://accounts.google.com https://www.gstatic.com";

      const csp = [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com",
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://www.gstatic.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com",
        "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: csp,
          },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

function resolveBasePath(): string {
  const explicitBase = process.env.VITE_BASE_PATH?.trim();
  if (explicitBase) {
    const normalized = explicitBase.startsWith('/') ? explicitBase : `/${explicitBase}`;
    return normalized.endsWith('/') ? normalized : `${normalized}/`;
  }
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (owner && repo) {
      if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
        return '/';
      }
      return `/${repo}/`;
    }
  }
  return '/';
}

export default defineConfig(() => {
  const basePath = resolveBasePath();

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      securityCspPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'theme-init.js',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: basePath,
          name: 'Lista de Compras',
          short_name: 'Lista de Compras',
          description:
            'App de lista de compras para Android e iPhone com organização por corredores, cálculo em tempo real e suporte offline.',
          theme_color: '#2563EB',
          background_color: '#F6F6F3',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: basePath,
          scope: basePath,
          lang: 'pt-BR',
          categories: ['shopping', 'productivity', 'utilities'],
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/__\/auth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
