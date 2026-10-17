import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

test('menu lateral recolhido: só ícones, com dica, e a escolha mantém-se ao recarregar', async ({
  page,
}) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Recolher o menu' }).click()
  const menu = page.getByRole('navigation', { name: 'Principal' })
  await menu.getByRole('link', { name: 'Calendário' }).hover()
  await expect(page.getByRole('tooltip', { name: 'Calendário' })).toBeVisible()
  await semViolacoes(page)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expandir o menu' })).toBeVisible()
  await menu.getByRole('link', { name: 'Turmas' }).click()
  await expect(page).toHaveURL(/\/turmas/)
})

test('no telemóvel o menu abre como gaveta e fecha ao navegar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await entrar(page)
  await expect(page.getByRole('button', { name: 'Recolher o menu' })).toBeHidden()
  await page.getByRole('button', { name: 'Abrir o menu' }).click()
  const gaveta = page.getByRole('dialog', { name: 'Menu' })
  await expect(gaveta).toBeVisible()
  await semViolacoes(page)
  await gaveta.getByRole('link', { name: 'Definições' }).click()
  await expect(gaveta).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Definições' })).toBeVisible()
  await semViolacoes(page)
})
