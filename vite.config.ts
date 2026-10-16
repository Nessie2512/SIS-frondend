/// <reference types="vitest/config" />
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { lingui, linguiTransformerBabelPreset } from '@lingui/vite-plugin'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { rmSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // O router tem de vir antes do react(): gera a árvore e divide o código por rota (guia 4.6)
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      // Os loaders também ficam fora do JavaScript inicial (puxam queries, mapeadores e date-fns);
      // descarregam em paralelo com o componente da rota
      codeSplittingOptions: {
        defaultBehavior: [
          ['loader'],
          ['component'],
          ['pendingComponent', 'errorComponent', 'notFoundComponent'],
        ],
      },
      routesDirectory: './src/routes',
      generatedRouteTree: './src/app/routeTree.gen.ts',
      routeFileIgnorePrefix: '-',
    }),
    react(),
    // Macros do Lingui e React Compiler na mesma passagem de Babel
    babel({ presets: [linguiTransformerBabelPreset(), reactCompilerPreset()] }),
    lingui(),
    tailwindcss(),
    // Casca da aplicação em cache e dados de referência para ligação fraca (guia 3.2, 5.8)
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icones/icone.svg', 'icones/apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Secretaria escolar',
        short_name: 'Secretaria',
        lang: 'pt-AO',
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f6f8',
        theme_color: '#ffffff',
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icones/icone-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['mockServiceWorker.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Só dados de referência; dados pessoais nunca ficam em cache (guia 5.8)
            urlPattern: ({ url }) =>
              /^\/api\/v1\/(anos-lectivos|ciclos|classes|disciplinas|calendario)(\/|$|\?)/.test(
                url.pathname,
              ),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'referencia',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    {
      // O service worker do MSW só serve o desenvolvimento; não vai para produção
      name: 'sem-msw-em-producao',
      apply: 'build',
      closeBundle() {
        rmSync(fileURLToPath(new URL('./dist/mockServiceWorker.js', import.meta.url)), {
          force: true,
        })
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 600,
    // O manifesto permite ao size-limit medir exactamente o JavaScript inicial
    manifest: true,
    rolldownOptions: {
      output: {
        // Bibliotecas pesadas que só alguns ecrãs usam ficam fora do JavaScript inicial (guia 1.2, 4.6)
        codeSplitting: {
          // Só os módulos que casam com o teste; as dependências partilhadas (React, store) ficam onde já estão
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'tabela',
              test: /node_modules[\\/]@tanstack[\\/](react-table|table-core|react-virtual|virtual-core)/,
            },
            { name: 'datas', test: /node_modules[\\/]date-fns/ },
          ],
        },
      },
    },
  },
  // Pré-optimizar evita recarregamentos a meio dos testes de histórias no navegador
  optimizeDeps: {
    include: [
      'react',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'radix-ui',
      'cmdk',
      'sonner',
      'lucide-react',
      'date-fns',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'zustand',
      'zustand/middleware',
      '@lingui/core',
      '@lingui/react',
      '@tanstack/react-query',
      '@tanstack/react-router',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'zod/mini',
      'openapi-fetch',
    ],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Mesma origem que a API: necessário para o cookie de renovação SameSite=Strict (guia 4.4)
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    // Um jsdom por ficheiro é pesado: com um worker por núcleo, máquinas Windows mais lentas
    // ficam sem CPU e os workers não chegam a arrancar. Metade dos núcleos chega e é estável.
    maxWorkers: '50%',
    projects: [
      {
        extends: true,
        test: {
          name: 'unidade',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          css: false,
          // Fluxos completos (assistente, quadro) passam de 5 s em máquinas mais lentas
          testTimeout: 30_000,
        },
      },
      {
        // Cada história do Storybook corre como teste no navegador, com verificação axe
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
            }),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
})
