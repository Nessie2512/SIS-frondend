import { expect, test } from '@playwright/test'
import { entrar } from './apoio.ts'

/** Lê as chaves das consultas guardadas no IndexedDB (dados de referência em disco). */
async function chavesEmDisco(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      new Promise<unknown[][]>((resolver, rejeitar) => {
        const pedido = indexedDB.open('secretaria', 1)
        pedido.onerror = () => rejeitar(pedido.error)
        pedido.onsuccess = () => {
          const leitura = pedido.result
            .transaction('cache', 'readonly')
            .objectStore('cache')
            .get('referencia')
          leitura.onsuccess = () => {
            const registo = leitura.result as
              { estado: { queries: { queryKey: unknown[] }[] } } | undefined
            resolver(registo?.estado.queries.map((q) => q.queryKey) ?? [])
          }
        }
      }),
  )
}

test('só os dados de referência vão para disco, e voltam ao reabrir', async ({ page }) => {
  await entrar(page, undefined, '/estudantes')
  await expect(page.getByRole('table', { name: 'Estudantes' })).toBeVisible()
  await page.goto('/curriculo/classes')
  await expect(page.getByRole('heading', { level: 1, name: 'Ciclos e classes' })).toBeVisible()
  await expect.poll(() => chavesEmDisco(page), { timeout: 5_000 }).toContainEqual(['classes'])
  await page.goto('/calendario')
  await expect(page.getByRole('heading', { level: 1, name: 'Calendário' })).toBeVisible()

  await expect
    .poll(async () => (await chavesEmDisco(page)).some((c) => c[0] === 'calendario'), {
      timeout: 5_000,
    })
    .toBe(true)
  const chaves = await chavesEmDisco(page)
  const raizes = new Set(chaves.map((c) => c[0]))
  // Nada de estudantes, matrículas, professores ou utilizadores (guia 5.8)
  for (const raiz of raizes) {
    expect(['anos-lectivos', 'classes', 'disciplinas', 'calendario']).toContain(raiz)
  }
  // As classes vistas antes de recarregar continuam lá: voltaram do disco e foram regravadas
  expect(chaves).toContainEqual(['classes'])

  // Ao reabrir, o que estava em disco entra logo na cache
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Calendário' })).toBeVisible()
  expect((await chavesEmDisco(page)).length).toBeGreaterThan(0)
})
