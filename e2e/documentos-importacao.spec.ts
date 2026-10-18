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
