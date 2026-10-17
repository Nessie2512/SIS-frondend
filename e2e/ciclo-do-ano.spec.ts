import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

test('docentes: substituir pede data e motivo, e o histórico guarda a anterior', async ({
  page,
}) => {
  await entrar(page, undefined, '/turmas?turma=ano-2026-c7-A')
  const docentes = page.getByRole('region', { name: 'Docentes' })
  await docentes.getByRole('button', { name: 'Substituir o docente de Matemática' }).click()
  const form = docentes.getByRole('form', { name: 'Substituir o docente de Matemática' })
  await semViolacoes(page)
  await form.getByRole('combobox', { name: /Novo docente/ }).click()
  await page
    .getByRole('option')
    .filter({ hasNot: page.locator('[aria-disabled="true"]') })
    .first()
    .click()
  await form.getByLabel(/Motivo/).fill('Licença de maternidade')
  await form.getByRole('button', { name: 'Substituir' }).click()
  await docentes.getByRole('button', { name: 'Histórico de Matemática' }).click()
  await expect(docentes.getByText(/Licença de maternidade/)).toBeVisible()
})

test('documentos oficiais: pré-visualizar, confirmar e emitir com número e código', async ({
  page,
}) => {
  await entrar(page, undefined, '/estudantes/e0001')
  await page.getByRole('tab', { name: 'Documentos oficiais' }).click()
  await page.getByRole('button', { name: 'Emitir documento' }).click()
  const folha = page.getByRole('dialog', { name: 'Emitir documento' })
  await folha.getByRole('radio', { name: /Declaração de frequência/ }).check()
  await expect(
    folha
      .getByRole('region', { name: 'Pré-visualização do documento' })
      .getByText(/frequenta nesta escola/),
  ).toBeVisible()
  await semViolacoes(page)
  await folha.getByLabel(/Revi o documento/).check()
  await folha.getByRole('button', { name: 'Emitir declaração' }).click()
  const emitido = page.getByRole('dialog', { name: 'Documento emitido' })
  await expect(emitido.getByText('DF-2026/00001')).toBeVisible()
  await semViolacoes(page)
})

test('anos lectivos: criar o ano seguinte, ver as etapas e duplicar as turmas', async ({
  page,
}) => {
  await entrar(page, undefined, '/anos-lectivos')
  await page.getByRole('button', { name: 'Criar o ano seguinte' }).click()
  await page.getByRole('button', { name: 'Criar 2027/2028' }).click()
  await expect(page).toHaveURL(/\/anos-lectivos\/ano-2027$/)
  const etapas = page.getByRole('list', { name: 'Etapas da abertura' })
  await expect(etapas).toBeVisible()
  await semViolacoes(page)
  await etapas.getByRole('button', { name: 'Duplicar as turmas' }).click()
  await expect(etapas.getByText('12 turmas preparadas.')).toBeVisible()
})

test('encerramento: pendências bloqueiam, cada uma com o caminho para a resolver', async ({
  page,
}) => {
  await entrar(page, undefined, '/anos-lectivos/ano-2026')
  const pendencias = page.getByRole('list', { name: 'Pendências do encerramento' })
  await expect(pendencias.getByText('Matrículas por confirmar')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Encerrar o ano 2026/2027' })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await semViolacoes(page)
  await pendencias.getByRole('link', { name: /^Registar resultados da turma 7\.ª A/ }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Resultados finais — 7.ª A' }),
  ).toBeVisible()
})
