import { defineConfig, devices } from '@playwright/test'

const PORTA = 5180
const executavel = process.env.PW_CHROMIUM_PATH
// Máquinas locais variam muito; na CI o ambiente é conhecido
const fatorTempo = process.env.CI ? 1 : 2

/**
 * Testes ponta a ponta (guia 8.1): fluxos críticos no navegador real, contra o backend
 * simulado pelo MSW (modo mock), com verificação de acessibilidade por axe em cada ecrã.
 *
 * Corre sobre uma build (vite build --mode mock + vite preview), não sobre o servidor de
 * desenvolvimento: este compila módulos a pedido e recarrega a página quando descobre novas
 * dependências, o que em máquinas mais lentas fazia os testes falhar a meio.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 5_000 * fatorTempo },
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
    command: `pnpm exec vite build --mode mock --outDir dist-e2e && pnpm exec vite preview --mode mock --outDir dist-e2e --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: false,
    // Inclui a build: em máquinas mais lentas passa de um minuto
    timeout: 300_000,
  },
})
