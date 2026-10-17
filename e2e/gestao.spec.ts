import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

test('situação do estudante: o menu só mostra transições válidas e o diálogo diz o efeito', async ({
  page,
}) => {
  await entrar(page, undefined, '/estudantes/e0001')
  await page.getByRole('button', { name: 'Situação' }).click()
  await expect(page.getByRole('menuitem', { name: /Registar reingresso/ })).toHaveCount(0)
  await page.getByRole('menuitem', { name: /Registar desistência/ }).click()
  const dialogo = page.getByRole('dialog', { name: /Registar a desistência/ })
  await expect(dialogo).toBeVisible()
  await semViolacoes(page)
  await dialogo.getByLabel(/Motivo/).fill('Mudou-se para outra província')
  await dialogo.getByRole('button', { name: 'Registar desistência' }).click()
  await expect(page.getByText('Desistente').first()).toBeVisible()
})

test('turmas: nova turma em folha e distribuição automática com simulação', async ({ page }) => {
  await entrar(page, undefined, '/turmas')
  await page.getByRole('button', { name: 'Nova turma' }).click()
  const folha = page.getByRole('dialog', { name: 'Nova turma' })
  await folha.getByRole('combobox', { name: /Classe/ }).click()
  await page.getByRole('option', { name: '7.ª classe' }).click()
  await semViolacoes(page)
  await folha.getByRole('button', { name: 'Criar turma' }).click()
  await expect(page.getByRole('table', { name: 'Turmas' }).getByText('7.ª D')).toBeVisible()

  await page.goto('/turmas/quadro?classeId=c7')
  await page.getByRole('button', { name: 'Distribuir automaticamente' }).click()
  const dist = page.getByRole('dialog', { name: 'Distribuir automaticamente' })
  await expect(dist.getByRole('heading', { name: 'Proposta (2)' })).toBeVisible()
  await semViolacoes(page)
  await dist.getByRole('button', { name: 'Inscrever 2 estudantes' }).click()
  await expect(
    page
      .getByRole('region', { name: 'Tarefas em segundo plano' })
      .getByText(/Distribuição por turmas/),
  ).toBeVisible()
})

test('encarregados e filtros avançados passam o axe', async ({ page }) => {
  await entrar(page, undefined, '/estudantes/e0001?separador=encarregados')
  await page.getByRole('button', { name: 'Acrescentar encarregado' }).click()
  const folha = page.getByRole('dialog', { name: 'Acrescentar encarregado' })
  await folha.getByLabel(/Procurar por nome ou telefone/).fill('92')
  await semViolacoes(page)
  await page.keyboard.press('Escape')

  await page.goto('/estudantes')
  await page.getByRole('button', { name: 'Filtros avançados' }).click()
  await expect(page.getByRole('dialog', { name: 'Filtros avançados' })).toBeVisible()
  await semViolacoes(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Aplicar' }).click()
  await page.getByRole('columnheader', { name: /Nome/ }).getByRole('button').click()
  await expect(page).toHaveURL(/ordem=nome/)
})

test('ciclos e classes: em uso só se inactiva, com a explicação', async ({ page }) => {
  await entrar(page, undefined, '/curriculo/classes')
  const ciclo = page.getByRole('region', { name: 'II ciclo do ensino secundário' })
  await expect(ciclo.getByRole('button', { name: 'Inactivar 10.ª classe' })).toBeVisible()
  await expect(ciclo.getByRole('button', { name: 'Eliminar 10.ª classe' })).toHaveCount(0)
  await semViolacoes(page)
})
