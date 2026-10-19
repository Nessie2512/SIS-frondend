import { expect, test, type Page } from '@playwright/test'
import { entrar } from './apoio.ts'

/** Regista as View Transitions que começam e os nomes que o navegador anima em cada uma. */
async function vigiarTransicoes(page: Page) {
  await page.evaluate(() => {
    const registo: string[][] = []
    Object.assign(window, { __transicoes: registo })
    const original = document.startViewTransition.bind(document)
    document.startViewTransition = ((arg: Parameters<typeof original>[0]) => {
      const t = original(arg)
      const nomes: string[] = []
      registo.push(nomes)
      void t.ready.then(() => {
        for (const a of document.getAnimations()) {
          const pseudo = (a.effect as KeyframeEffect | null)?.pseudoElement
          if (pseudo?.startsWith('::view-transition-group')) nomes.push(pseudo.slice(24, -1))
        }
      })
      return t
    }) as typeof document.startViewTransition
  })
  return () => page.evaluate(() => (window as unknown as { __transicoes: string[][] }).__transicoes)
}

test('a linha expande-se no painel e o painel na ficha; filtros mudam sem animação', async ({
  page,
}) => {
  await entrar(page, undefined, '/estudantes')
  await page.waitForLoadState('networkidle')
  const transicoes = await vigiarTransicoes(page)

  await page.getByRole('table', { name: 'Estudantes' }).getByRole('row').nth(2).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect
    .poll(async () => (await transicoes()).some((nomes) => nomes.includes('ficha')))
    .toBe(true)

  await page.getByRole('link', { name: 'Abrir ficha' }).click()
  await expect(page.getByRole('tab', { name: 'Resumo' })).toBeVisible()
  await expect.poll(async () => (await transicoes()).at(-1)).toContain('ficha')

  // Pesquisar e filtrar não animam o ecrã
  await page.goto('/estudantes')
  const depois = await vigiarTransicoes(page)
  await page.getByLabel('Pesquisar').fill('ana')
  await expect(page).toHaveURL(/q=ana/)
  expect(await depois()).toEqual([])
})
