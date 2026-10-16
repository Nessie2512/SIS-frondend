import { expect, test } from '@playwright/test'
import { entrar, semViolacoes } from './apoio.ts'

test('o quadro distribui por arrastar e largar, com teclado, e permite desfazer', async ({
  page,
}) => {
  await entrar(page, undefined, '/turmas/quadro?classeId=c7')
  const semTurma = page.getByRole('region', { name: 'Sem turma' })
  const turmaC = page.getByRole('region', { name: '7.ª C' })
  await expect(semTurma.getByRole('listitem')).toHaveCount(3)
  await semViolacoes(page)

  // Teclado (dnd-kit): espaço pega, setas movem, espaço larga
  const cartao = semTurma.getByRole('button', { name: /^Arrastar / }).first()
  const nome = (await cartao.getAttribute('aria-label'))!.replace(/^Arrastar /, '')
  await cartao.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await expect(turmaC.getByRole('button', { name: `Arrastar ${nome}` })).toBeVisible()
  await expect(semTurma.getByRole('listitem')).toHaveCount(2)

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(semTurma.getByRole('button', { name: `Arrastar ${nome}` })).toBeVisible()
})

test('mudar de turma pelo menu pede o motivo', async ({ page }) => {
  await entrar(page, undefined, '/turmas/quadro?classeId=c7')
  const turmaA = page.getByRole('region', { name: '7.ª A' })
  const menu = turmaA.getByRole('button', { name: /^Mover .+ para…$/ }).first()
  await menu.click()
  await page.getByRole('menuitem', { name: /^7\.ª C/ }).click()

  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByRole('button', { name: 'Mudar de turma' })).toBeDisabled()
  await dialogo.getByLabel(/Motivo/).fill('Pedido do encarregado')
  await semViolacoes(page)
  await dialogo.getByRole('button', { name: 'Mudar de turma' }).click()
  await expect(dialogo).toBeHidden()
})

test('gerar a lista nominal acompanha a tarefa no quadro de tarefas', async ({ page }) => {
  await entrar(page, undefined, '/turmas?turma=ano-2026-c7-A')
  await page.getByRole('button', { name: 'Gerar lista nominal' }).click()
  const quadro = page.getByRole('region', { name: 'Tarefas em segundo plano' })
  await expect(quadro.getByText('Lista nominal da 7.ª A')).toBeVisible()
  await expect(quadro.getByRole('link', { name: 'Descarregar' })).toBeVisible({ timeout: 15_000 })
})
