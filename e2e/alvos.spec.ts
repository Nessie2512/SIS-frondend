import { expect, test } from '@playwright/test'
import { alvosPequenos } from './alvos.ts'
import { entrar } from './apoio.ts'

/** Ecrãs principais, os mesmos do tema escuro, mais os novos (guia 8.1). */
const ECRAS: [string, string | RegExp][] = [
  ['/', /^Bo[am] (dia|tarde|noite)/],
  ['/estudantes', 'Estudantes'],
  ['/estudantes/e0001', 'Maria Quintas Santos'],
  ['/estudantes/importar', 'Importar estudantes'],
  ['/matriculas', 'Matrículas'],
  ['/matriculas/nova', 'Matricular estudante novo'],
  ['/turmas', 'Turmas'],
  ['/turmas/quadro?classeId=c7', 'Distribuição por turmas'],
  ['/professores', 'Professores'],
  ['/curriculo?classeId=c7', 'Plano da 7.ª classe'],
  ['/curriculo/classes', 'Ciclos e classes'],
  ['/calendario', 'Calendário'],
  ['/anos-lectivos', 'Anos lectivos'],
  ['/anos-lectivos/ano-2026', 'Ano lectivo 2026/2027'],
  ['/turmas/ano-2026-c7-A/resultados', 'Resultados finais'],
  ['/matriculas/renovar', 'Renovação de matrículas'],
  ['/documentos', 'Documentos'],
  ['/relatorios', 'Relatórios'],
  ['/definicoes/utilizadores', 'Definições'],
  ['/definicoes/perfis', 'Definições'],
  ['/definicoes/auditoria', 'Definições'],
]

async function percorrer(page: import('@playwright/test').Page, minimo: number) {
  const encontrados: string[] = []
  const movel = minimo > 32
  for (const [endereco, titulo] of ECRAS) {
    await page.goto(endereco)
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    await page.waitForLoadState('networkidle')
    for (const p of await alvosPequenos(page, minimo)) encontrados.push(`${endereco}: ${p}`)
    // No telemóvel, nada sai do ecrã na horizontal (as tabelas deslizam dentro do contentor)
    if (movel && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)))
      encontrados.push(`${endereco}: a página desliza na horizontal`)
  }
  return encontrados
}

test('alvos de clique com pelo menos 32 px em computador', async ({ page }) => {
  test.slow()
  await entrar(page)
  expect(await percorrer(page, 32)).toEqual([])
})

test.describe('em toque', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 } })

  test('alvos de toque com pelo menos 44 px', async ({ page }) => {
    test.slow()
    await entrar(page)
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    expect(await percorrer(page, 44)).toEqual([])
  })
})
