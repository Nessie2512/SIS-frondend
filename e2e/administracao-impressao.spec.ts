import { expect, test } from '@playwright/test'
import { CONSULTA, entrar, semViolacoes } from './apoio.ts'

test('administração: desactivar uma conta com Desfazer e ver o registo na auditoria', async ({
  page,
}) => {
  await entrar(page, undefined, '/definicoes/utilizadores')
  const tabela = page.getByRole('table', { name: 'Utilizadores' })
  await expect(tabela.getByText('(a sua conta)')).toBeVisible()
  await semViolacoes(page)

  const botao = tabela.getByRole('button', { name: /^Desactivar / }).first()
  const rotulo = (await botao.getAttribute('aria-label'))!
  const nome = rotulo.replace('Desactivar ', '')
  await botao.click()
  await expect(tabela.getByRole('button', { name: `Activar ${nome}` })).toBeVisible()
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(tabela.getByRole('button', { name: `Desactivar ${nome}` })).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Secções das definições' })
    .getByRole('link', { name: 'Auditoria' })
    .click()
  await expect(page).toHaveURL(/\/definicoes\/auditoria/)
  await expect(page.getByRole('heading', { level: 2, name: 'Auditoria' })).toBeVisible()
  await page.getByLabel('Pesquisar').fill(nome)
  const auditoria = page.getByRole('table', { name: 'Registo de auditoria' })
  await expect(auditoria.getByText(`${nome}: desactivado`)).toBeVisible()
  await expect(auditoria.getByText(`${nome}: activado`)).toBeVisible()
  // Enquanto chega o resultado da pesquisa, a tabela fica translúcida: o axe mede-a depois
  await expect
    .poll(() =>
      auditoria.evaluate((el) => getComputedStyle(el.closest('.transition-opacity')!).opacity),
    )
    .toBe('1')
  await semViolacoes(page)
})

test('quem só consulta não vê as secções de administração', async ({ page }) => {
  await entrar(page, CONSULTA, '/definicoes')
  const seccoes = page.getByRole('navigation', { name: 'Secções das definições' })
  await expect(seccoes.getByRole('link')).toHaveCount(1)
})

test('impressão: lista nominal com pré-visualização e folha limpa no papel', async ({ page }) => {
  await entrar(page, undefined, '/turmas')
  await page
    .getByRole('row', { name: /7\.ª A/ })
    .first()
    .click()
  await page.getByRole('link', { name: 'Imprimir lista' }).click()
  const folha = page.getByRole('article', { name: 'Lista nominal — 7.ª A' })
  await expect(folha.getByRole('table')).toBeVisible()
  await expect(page).toHaveTitle('Lista nominal — 7.ª A')
  await semViolacoes(page)

  // Em papel: só a folha; menu, cabeçalho e barra de acções desaparecem
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Imprimir' })).toBeHidden()
  await expect(page.locator('#menu-lateral')).toBeHidden()
  await expect(folha).toBeVisible()
})
