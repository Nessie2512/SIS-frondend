import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

/**
 * Acessibilidade no tema escuro (guia 6.4, 8.1): o mesmo axe dos outros testes, com o sistema
 * em modo escuro. O contraste é o que mais muda entre temas, por isso cada ecrã principal passa.
 */
const ECRAS: [string, string | RegExp][] = [
  ['/', /^Bo[am] (dia|tarde|noite)/],
  ['/estudantes', 'Estudantes'],
  ['/estudantes/e0001', 'Maria Quintas Santos'],
  ['/matriculas', 'Matrículas'],
  ['/turmas', 'Turmas'],
  ['/professores', 'Professores'],
  ['/curriculo?classeId=c7', 'Plano da 7.ª classe'],
  ['/calendario', 'Calendário'],
  ['/relatorios', 'Relatórios'],
  ['/definicoes', 'Definições'],
  ['/definicoes/utilizadores', 'Definições'],
  ['/definicoes/perfis', 'Definições'],
  ['/definicoes/auditoria', 'Definições'],
  ['/imprimir/turma/ano-2026-c7-A', 'Pré-visualização'],
  ['/anos-lectivos', 'Anos lectivos'],
  ['/anos-lectivos/ano-2026', 'Ano lectivo 2026/2027'],
  ['/turmas/ano-2026-c7-A/resultados', 'Resultados finais'],
  ['/matriculas/renovar', 'Renovação de matrículas'],
  ['/curriculo/classes', 'Ciclos e classes'],
]

test.use({ colorScheme: 'dark' })

test('todos os ecrãs principais sem violações no tema escuro', async ({ page }) => {
  test.slow()
  await entrar(page)
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro')
  for (const [endereco, titulo] of ECRAS) {
    await test.step(endereco, async () => {
      await page.goto(endereco)
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
      // Esperar que os dados cheguem e os esqueletos dêem lugar ao conteúdo antes de avaliar
      await page.waitForLoadState('networkidle')
      await semViolacoes(page)
    })
  }
})
