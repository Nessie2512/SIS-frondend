import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'public/mockServiceWorker.js',
    'src/app/routeTree.gen.ts',
    'src/shared/api/schema.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // v7: o preset recomendado inclui as regras do React Compiler (guia 3.2)
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Guia 3.3: dados do servidor nunca com fetch solto; usar o cliente gerado
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa o cliente `api` de @/shared/api.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'moment', message: 'Usa date-fns e Intl (guia 3.3).' },
            { name: 'lodash', message: 'Não importar Lodash inteiro (guia 3.3).' },
          ],
        },
      ],
    },
  },
  {
    // Ficheiros de rota exportam `Route`; o plugin do TanStack Router trata do HMR
    files: ['src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // A camada de API é a única que pode usar fetch directamente
    files: ['src/shared/api/**/*.{ts,tsx}', 'src/mocks/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-globals': 'off' },
  },
])
