import { defineConfig } from '@lingui/cli'
import { formatter } from '@lingui/format-po'

/**
 * Internacionalização (guia 8.2): português de Angola como língua base, mensagens ICU,
 * preparado para acrescentar outras línguas. `pnpm i18n:extrair` actualiza o catálogo.
 */
export default defineConfig({
  sourceLocale: 'pt-AO',
  locales: ['pt-AO'],
  // Sem números de linha: o catálogo só muda quando as mensagens mudam
  format: formatter({ lineNumbers: false }),
  catalogs: [
    {
      path: '<rootDir>/src/shared/i18n/locales/{locale}/messages',
      include: ['src'],
      exclude: ['**/*.test.*', 'src/mocks/**', 'src/test/**', '**/*.stories.*'],
    },
  ],
})
