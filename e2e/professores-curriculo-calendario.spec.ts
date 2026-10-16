import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

test('professores: lista, vista guardada, ficha e mudança de estado com Desfazer', async ({
  page,
}) => {
  await entrar(page, undefined, '/professores')
  await expect(page.getByRole('heading', { level: 1, name: 'Professores' })).toBeVisible()
  await semViolacoes(page)

  // Guardar a vista «Activos»
  await page.getByRole('combobox', { name: 'Estado' }).click()
  await page.getByRole('option', { name: 'Activo' }).click()
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await page.getByLabel(/Nome da vista/).fill('Activos')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Activos', pressed: true })).toBeVisible()

  await page.getByRole('row').nth(1).click()
  await page.getByRole('link', { name: 'Abrir ficha' }).click()
  await expect(page.getByRole('tab', { name: /Atribuições/ })).toBeVisible()
  await semViolacoes(page)

  await page.getByRole('button', { name: 'Alterar estado' }).click()
  await page.getByRole('menuitemradio', { name: /De licença/ }).click()
  const cabecalho = page.locator('header', { has: page.getByRole('heading', { level: 1 }) })
  await expect(cabecalho.getByText('De licença')).toBeVisible()
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(cabecalho.getByText('Activo')).toBeVisible()
})

test('currículo: editar o rascunho no sítio e ver as disciplinas', async ({ page }) => {
  await entrar(page, undefined, '/curriculo?classeId=c7')
  await expect(page.getByRole('heading', { name: 'Plano da 7.ª classe' })).toBeVisible()
  await semViolacoes(page)

  await page.getByRole('button', { name: /^Editar Matemática:/ }).click()
  await page.getByRole('textbox', { name: 'Matemática' }).fill('6')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /^Editar Matemática: 6 h/ })).toBeVisible()

  await page.getByRole('radio', { name: 'Versão 2 · Vigente' }).click()
  await expect(page.getByText(/Em vigor desde/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0)

  await page.getByRole('link', { name: 'Disciplinas' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Disciplinas' })).toBeVisible()
  await semViolacoes(page)
})

test('calendário: grelha do ano, teclado e evento novo num dia', async ({ page }) => {
  await entrar(page, undefined, '/calendario')
  await expect(page.getByRole('heading', { name: 'Calendário 2026/2027' })).toBeVisible()
  await semViolacoes(page)

  const dia = page.getByRole('button', { name: /^segunda-feira, 19 de outubro de 2026/ })
  await dia.focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('button', { name: /^terça-feira, 20 de outubro de 2026/ }),
  ).toBeFocused()
  await page.keyboard.press('Enter')

  const folha = page.getByRole('dialog', { name: 'terça-feira, 20 de outubro de 2026' })
  await expect(folha).toBeVisible()
  await semViolacoes(page)
  await folha.getByLabel(/Nome/).fill('Feira de ciências')
  await folha.getByRole('button', { name: 'Acrescentar ao calendário' }).click()
  await expect(folha.getByText('Feira de ciências')).toBeVisible()
})
