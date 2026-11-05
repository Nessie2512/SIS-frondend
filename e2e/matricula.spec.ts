import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

test('matricula um estudante novo do princípio ao fim', async ({ page }) => {
  await entrar(page, undefined, '/matriculas/nova')
  await expect(page.getByRole('heading', { name: 'Dados pessoais' })).toBeVisible()
  await semViolacoes(page)

  await page.getByLabel(/Nome completo/).fill('Teresa Kalunga Mbala')
  await page.getByLabel(/Data de nascimento/).fill('12/02/2013')
  await page.keyboard.press('Tab')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  // Dados civis e de residência (contrato do backend SIS)
  await page.getByLabel(/Nacionalidade/).fill('Angolana')
  await page.getByLabel(/Rua e número/).fill('Rua 12, casa 45')
  await page.getByLabel(/Bairro ou quarteirão/).fill('Golf II')
  await page.getByLabel(/Município/).fill('Kilamba Kiaxi')
  await page.getByLabel(/Província/).fill('Luanda')
  await page.getByRole('button', { name: 'Seguinte' }).click()

  await expect(page.getByRole('heading', { name: 'Encarregados' })).toBeVisible()
  // Dados familiares (pai, mãe, idioma e prefixo da família)
  await page.getByLabel(/Nome do pai/).fill('Carlos Mbala')
  await page.getByLabel(/Contacto do pai/).fill('923000222')
  await page.getByLabel(/Nome da mãe/).fill('Marta Kalunga')
  await page.getByLabel(/Contacto da mãe/).fill('923000111')
  await page.getByLabel(/Idioma preferencial/).fill('Português')
  await page.getByLabel(/Prefixo familiar/).fill('FAM-KALUNGA')
  await page
    .getByLabel(/Nome completo/)
    .first()
    .fill('Marta Kalunga')
  await page.getByLabel(/Parentesco/).fill('Mãe')
  await page.getByLabel(/Telefone/).fill('923000111')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible()
  await page.getByLabel('Certidão de nascimento').check()
  await page.getByRole('button', { name: 'Seguinte' }).click()

  await expect(page.getByRole('heading', { name: 'Classe e turma' })).toBeVisible()
  await page.getByRole('combobox', { name: /Classe/ }).click()
  await page.getByRole('option', { name: /8\.ª classe/ }).click()
  await expect(page.getByText('Sugerida')).toBeVisible()
  await semViolacoes(page)
  await page.getByRole('button', { name: 'Seguinte' }).click()

  await expect(page.getByRole('heading', { name: 'Revisão' })).toBeVisible()
  await page.getByRole('button', { name: 'Matricular' }).click()

  await expect(
    page.getByRole('heading', {
      name: 'Perfil de Teresa Kalunga Mbala criado; matrícula por confirmar',
    }),
  ).toBeVisible()
  // Faltam documentos obrigatórios: o perfil fica criado, a matrícula a confirmar, e a ficha
  // abre nos documentos
  await expect(page.getByText(/Faltam \d+ documentos obrigatórios/)).toBeVisible()
  await page.getByRole('link', { name: 'Abrir ficha' }).click()
  await expect(page).toHaveURL(/separador=documentos/)
  await expect(page.getByRole('heading', { level: 1, name: 'Teresa Kalunga Mbala' })).toBeVisible()
  await semViolacoes(page)
})
