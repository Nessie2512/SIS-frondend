import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import pluginLingui from 'eslint-plugin-lingui'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'storybook-static',
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
      pluginLingui.configs['flat/recommended'],
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
      // Cartões de escolha têm o texto em elementos aninhados
      'jsx-a11y/label-has-associated-control': ['error', { depth: 4 }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'moment', message: 'Usa date-fns e Intl (guia 3.3).' },
            { name: 'lodash', message: 'Não importar Lodash inteiro (guia 3.3).' },
            {
              name: 'zod',
              message:
                'Nas rotas usa zod/mini (vai no JavaScript inicial); o zod completo só em features carregadas sob procura.',
            },
          ],
        },
      ],
    },
  },
  {
    // Guia 8.2: nenhum texto fixo em componentes; tudo passa pelo catálogo de mensagens
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/**/*.test.*',
      'src/**/*.stories.*',
      'src/mocks/**',
      'src/test/**',
      'src/shared/api/**',
    ],
    rules: {
      'lingui/no-unlocalized-strings': [
        'error',
        {
          ignore: [
            // identificadores, chaves, classes de uma palavra, caminhos e constantes
            '^[^A-ZÀ-Ý\\s][^\\s]*$',
            '^[A-Z0-9_:./-]+$',
            // fusos horários IANA
            '^[A-Z][a-z]+/[A-Za-z_]+$',
            // teclas de atalho (mod+k, g t, Esc)
            '^(mod\\+|shift\\+)*[a-z?/]+( [a-z])?$',
            '^(Esc|Enter|Ctrl\\+)$',
            // valores CSS (curvas, durações)
            '^cubic-bezier\\(',
            // directivas do React Compiler
            '^use (no )?memo$',
          ],
          ignoreNames: [
            { regex: { pattern: '^class|class(es)?(Name)?$', flags: 'i' } },
            {
              regex: {
                pattern: '^(aria-(?!label|description|valuetext|roledescription)|data-)',
                flags: 'i',
              },
            },
            'variante',
            'tamanho',
            'tom',
            'type',
            'role',
            'id',
            'key',
            'href',
            'to',
            'from',
            'name',
            'position',
            'side',
            'align',
            'orientation',
            'queryKey',
            'mutationKey',
            'lang',
            'dir',
            'inputMode',
            'autoComplete',
            'target',
            'rel',
            'teclas',
            'atalho',
          ],
          ignoreFunctions: [
            'cn',
            'cva',
            'clsx',
            'console.*',
            'Error',
            'URL',
            'createFileRoute',
            'createRootRouteWithContext',
            'z.enum',
            'z.literal',
            '*.addEventListener',
            '*.removeEventListener',
            'matchMedia',
            '*.matchMedia',
            'document.*',
            'localStorage.*',
            'sessionStorage.*',
            '*.headers.set',
            '*.headers.get',
            '*.has',
            '*.get',
            '*.set',
            'useHotkey',
            'atalho',
            'invariant',
          ],
        },
      ],
    },
  },
  {
    // Ficheiros de rota exportam `Route`; o plugin do TanStack Router trata do HMR
    files: ['src/routes/**/*.tsx', '.storybook/**/*.tsx', 'src/**/*.stories.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Formulários (features) podem usar o zod completo: carregam com a rota que os usa
    files: ['src/features/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // A camada de API é a única que pode usar fetch directamente
    files: ['src/shared/api/**/*.{ts,tsx}', 'src/mocks/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-globals': 'off' },
  },
])
