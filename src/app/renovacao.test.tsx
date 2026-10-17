import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { anosLectivos, db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

/** 2027/2028 planeado; resultados registados só na 7.ª A (um reprovado) e na 10.ª A. */
function prepararAnoSeguinte() {
  anosLectivos.push({
    id: 'ano-2027',
    designacao: '2027/2028',
    dataInicio: '2027-09-01',
    dataFim: '2028-07-31',
    estado: 'PLANEADO',
  })
  const comResultado = db.matriculas.filter(
    (m) =>
      m.estado === 'CONFIRMADA' &&
      (m.turmaId === 'ano-2026-c7-A' || m.turmaId === 'ano-2026-c10-A'),
  )
  comResultado.forEach((m, i) => (m.resultado = i === 0 ? 'REPROVADO' : 'APROVADO'))
  return comResultado
}

const renovadas = () => db.matriculas.filter((m) => m.anoLectivoId === 'ano-2027')

describe('Renovação de matrículas em lote', () => {
  it('simula, deixa retirar à mão e renova o número exacto confirmado', async () => {
    const comResultado = prepararAnoSeguinte()
    const da7 = comResultado.filter((m) => m.classeId === 'c7')
    renderizarEm('/matriculas/renovar')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Simular a renovação' }))

    const resumo = await screen.findByRole('table', { name: 'Renovação por classe de destino' })
    const linha8 = within(resumo).getByRole('row', { name: /^8\.ª classe/ })
    expect(
      within(linha8)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual([String(da7.length - 1), '0', String(da7.length - 1)])
    // Quem concluiu a 10.ª classe não tem classe seguinte na escola: só a 7.ª A renova
    expect(screen.getByRole('heading', { name: `Renovam (${da7.length})` })).toBeInTheDocument()
    expect(
      screen.getByText(/ficam de fora por não terem resultado final registado em 2026\/2027/),
    ).toBeInTheDocument()

    const n = da7.length
    const primeiro = db.estudantes.find((e) => e.id === da7[1]!.estudanteId)!
    await utilizador.click(screen.getByRole('button', { name: `Retirar ${primeiro.nome}` }))
    await utilizador.click(
      screen.getByRole('button', { name: `Confirmar a renovação de ${n - 1} matrículas` }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: `Renovar ${n - 1} matrículas para 2027/2028`,
    })
    await utilizador.click(within(dialogo).getByRole('button', { name: `Renovar ${n - 1}` }))

    await waitFor(() => expect(renovadas()).toHaveLength(n - 1))
    expect(renovadas().filter((m) => m.classeId === 'c7')).toHaveLength(1) // o reprovado repete
    expect(renovadas().some((m) => m.estudanteId === primeiro.id)).toBe(false)
    expect(renovadas().every((m) => m.estado === 'CONFIRMADA' && m.turmaId === null)).toBe(true)
    expect(
      await screen.findByText(/A renovação está a correr em segundo plano/),
    ).toBeInTheDocument()
    const quadro = await screen.findByRole('region', { name: 'Tarefas em segundo plano' })
    expect(
      await within(quadro).findByText(`Renovação para 2027/2028: ${n - 1} matrículas`),
    ).toBeInTheDocument()
  })

  it('avisa por linha quem entretanto deixou de poder renovar', async () => {
    const comResultado = prepararAnoSeguinte()
    renderizarEm('/matriculas/renovar')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Simular a renovação' }))
    await screen.findByRole('table', { name: 'Matrículas a renovar' })

    // Entre a simulação e a confirmação, alguém matricula um destes estudantes à mão
    const alvo = comResultado[2]!
    const nome = db.estudantes.find((e) => e.id === alvo.estudanteId)!.nome
    db.matriculas.push({
      ...alvo,
      id: 'm-manual',
      anoLectivoId: 'ano-2027',
      turmaId: null,
      resultado: null,
    })

    await utilizador.click(screen.getByRole('button', { name: /^Confirmar a renovação de/ }))
    const dialogo = await screen.findByRole('dialog')
    await utilizador.click(within(dialogo).getByRole('button', { name: /^Renovar \d+$/ }))
    const quadro = await screen.findByRole('region', { name: 'Tarefas em segundo plano' })
    expect(await within(quadro).findByText('Concluída com avisos:')).toBeInTheDocument()
    expect(
      within(quadro).getByText(
        `Linha 1: ${nome}: já tinha matrícula em 2027/2028; não foi renovado.`,
      ),
    ).toBeInTheDocument()
  })

  it('sem ano seguinte criado, explica e leva aos anos lectivos', async () => {
    renderizarEm('/matriculas/renovar')
    expect(
      await screen.findByText('Ainda não há ano seguinte para onde renovar.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Anos lectivos' })).toHaveAttribute(
      'href',
      '/anos-lectivos',
    )
  })
})
