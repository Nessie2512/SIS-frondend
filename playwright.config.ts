import { defineConfig, devices } from '@playwright/test'

const PORTA = 5180
const executavel = process.env.PW_CHROMIUM_PATH

/**
 * Testes ponta a ponta (guia 8.1): fluxos críticos no navegador real, contra o backend
 * simulado pelo MSW (modo mock), com verificação de acessibilidade por axe em cada ecrã.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-AO',
    timezoneId: 'Africa/Luanda',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Permite usar um Chromium já instalado (ex.: imagens de CI com navegador próprio)
        launchOptions: executavel ? { executablePath: executavel } : {},
      },
    },
  ],
  webServer: {
    command: `pnpm exec vite --mode mock --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
