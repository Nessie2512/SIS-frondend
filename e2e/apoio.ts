import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const SECRETARIA = { email: 'secretaria@escola.ao', palavraPasse: 'secretaria' }
export const CONSULTA = { email: 'consulta@escola.ao', palavraPasse: 'consulta' }

export async function entrar(page: Page, conta = SECRETARIA, destino = '/') {
  await page.goto(`/entrar?voltar=${encodeURIComponent(destino)}`)
  await page.getByLabel(/Email/).fill(conta.email)
  await page.getByLabel(/Palavra-passe/).fill(conta.palavraPasse)
  await page.getByRole('button', { name: 'Entrar' }).click()
  const caminho = destino.split('?')[0]!
  await expect(page).toHaveURL((url) => url.pathname === caminho)
}

/** Sem violações WCAG 2.2 A/AA no estado actual da página (guia 6.4). */
export async function semViolacoes(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Notificações do Sonner entram e saem com animação: avaliadas nas histórias
    .exclude('[data-sonner-toaster]')
    .analyze()
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}
