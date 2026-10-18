import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

const CSV = [
  'nome;sexo;data_nascimento;bilhete;classe;encarregado;parentesco;telefone',
  'Ana Maria Domingos;F;14/03/2014;004512345LA041;7.ª classe;Rosa Domingos;Mãe;923 000 001',
  'Joana;X;14/03/2014;;7;Rosa;Mãe;123',
  'Pedro Afonso Neto;M;2013-09-02;;8;Afonso Neto;Pai;923000003',
].join('\n')

test('importação: análise no Worker, erros por linha, confirmação e tarefa', async ({ page }) => {
  await entrar(page, undefined, '/estudantes/importar')
  await page.getByLabel('Ficheiro CSV').setInputFiles({
    name: 'novos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf-8'),
  })
  await expect(page.getByText('3 linhas: 2 prontas a importar, 1 com erros.')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Erros por linha' })).toContainText('Use M ou F.')
  await semViolacoes(page)
  await page.getByLabel(/Importar só as 2 linhas sem erros/).check()
  await page.getByRole('button', { name: 'Importar 2 estudantes' }).click()
  await expect(page.getByRole('heading', { name: 'Importação concluída' })).toBeVisible({
    timeout: 15_000,
  })
  await semViolacoes(page)
  await page.getByRole('link', { name: 'Ver matrículas pendentes' }).click()
  await expect(page.getByRole('table', { name: 'Matrículas' })).toContainText('Ana Maria Domingos')
})

test('documentos: emissão em lote para uma turma, PDF único e lista da área', async ({ page }) => {
  await entrar(page, undefined, '/documentos')
  await expect(page.getByText('Ainda não foram emitidos documentos oficiais.')).toBeVisible()
  await semViolacoes(page)
  await page.getByRole('button', { name: 'Emitir em lote' }).click()
  const folha = page.getByRole('dialog', { name: 'Emitir em lote' })
  await folha.getByRole('combobox', { name: /Turma/ }).click()
  await page.getByRole('option', { name: /^7\.ª A/ }).click()
  await expect(folha.getByRole('list', { name: 'Recebem' })).toBeVisible()
  await semViolacoes(page)
  await folha.getByLabel(/Revi quem recebe/).check()
  await folha.getByRole('button', { name: /^Emitir \d+ declarações de frequência$/ }).click()
  const pdf = folha.getByRole('link', { name: 'Descarregar PDF' })
  await expect(pdf).toBeVisible({ timeout: 15_000 })
  // Com MSW, as navegações de descarga não passam pelo service worker: lê-se com fetch
  const href = (await pdf.getAttribute('href'))!
  const cabecalho = await page.evaluate(async (url) => {
    // eslint-disable-next-line no-restricted-globals -- no browser, fora da aplicação
    const r = await fetch(url)
    return [r.headers.get('Content-Type'), (await r.text()).slice(0, 8)]
  }, href)
  expect(cabecalho).toEqual(['application/pdf', '%PDF-1.4'])
  await folha.getByRole('button', { name: 'Concluir' }).click()
  await expect(page.getByRole('table', { name: 'Documentos emitidos' })).toContainText(
    'DF-2026/00001',
  )
  await semViolacoes(page)
})
