import { expect, test } from '@playwright/test'
import { CONSULTA, entrar, semViolacoes } from './apoio.ts'

test('sem sessão vai para a entrada e volta à rota pedida depois de entrar', async ({ page }) => {
  await page.goto('/turmas')
  await expect(page).toHaveURL(/\/entrar\?voltar=/)
  await semViolacoes(page)

  await page.getByLabel(/Email/).fill('secretaria@escola.ao')
  await page.getByLabel(/Palavra-passe/).fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText(/O email ou a palavra-passe não estão correctos/)).toBeVisible()

  await page.getByLabel(/Palavra-passe/).fill('secretaria')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/turmas(\?|$)/)
  await expect(page.getByRole('heading', { level: 1, name: 'Turmas' })).toBeVisible()
})

test('o início mostra os indicadores e passa o axe', async ({ page }) => {
  await entrar(page)
  await expect(page.getByRole('link', { name: /Matrículas a confirmar/ })).toBeVisible()
  await semViolacoes(page)
})

test('uma conta só de consulta não vê acções de escrita', async ({ page }) => {
  await entrar(page, CONSULTA, '/estudantes')
  await expect(page.getByRole('heading', { level: 1, name: 'Estudantes' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Matricular estudante' })).toHaveCount(0)
})

test('sair termina a sessão e protege as rotas', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: /^Conta de / }).click()
  await page.getByRole('menuitem', { name: 'Terminar sessão' }).click()
  await expect(page).toHaveURL(/\/entrar/)
  await page.goto('/estudantes')
  await expect(page).toHaveURL(/\/entrar\?voltar=/)
})
