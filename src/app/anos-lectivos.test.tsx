import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { anosLectivos, db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

const ano = (id: string) => anosLectivos.find((a) => a.id === id)!

/** Resolve as pendências de 2026/2027 directamente nos dados simulados. */
function resolverPendencias() {
  for (const m of db.matriculas) {
    if (m.anoLectivoId !== 'ano-2026') continue
    if (m.estado === 'PENDENTE' || !m.turmaId) m.estado = 'ANULADA'
    else m.resultado = m.id.endsWith('7') ? 'REPROVADO' : 'APROVADO'
  }
}

describe('Encerramento do ano lectivo', () => {
  it('com pendências, encerrar fica desactivado e cada pendência leva ao ecrã certo', async () => {
    renderizarEm('/anos-lectivos/ano-2026')
    const lista = await screen.findByRole('list', { name: 'Pendências do encerramento' })
    expect(within(lista).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    expect(within(lista).getByRole('link', { name: 'Ver matrículas' })).toHaveAttribute(
      'href',
      '/matriculas?estado=PENDENTE&page=1',
    )
    expect(
      within(lista).getByRole('link', { name: /^Registar resultados da turma 7\.ª A/ }),
    ).toHaveAttribute('href', '/turmas/ano-2026-c7-A/resultados')
    expect(screen.getByRole('button', { name: 'Encerrar o ano 2026/2027' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('sem pendências, encerra com confirmação digitada e passa a só consulta', async () => {
    resolverPendencias()
    renderizarEm('/anos-lectivos/ano-2026')
    const utilizador = userEvent.setup()
    const lista = await screen.findByRole('list', { name: 'Pendências do encerramento' })
    expect(within(lista).getAllByText('Nenhuma. Está resolvido.')).toHaveLength(3)

    await utilizador.click(screen.getByRole('button', { name: 'Encerrar o ano 2026/2027' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Encerrar o ano 2026/2027' })
    const confirmar = within(dialogo).getByRole('button', { name: 'Encerrar o ano' })
    expect(confirmar).toBeDisabled()
    await utilizador.type(within(dialogo).getByLabelText(/Escreva 2026\/2027/), '2026/2027')
    expect(confirmar).toBeEnabled()
    await utilizador.click(confirmar)

    await waitFor(() => expect(ano('ano-2026').estado).toBe('ENCERRADO'))
    const doAno = db.matriculas.filter((m) => m.anoLectivoId === 'ano-2026')
    expect(doAno.filter((m) => m.resultado).every((m) => m.estado === 'CONCLUIDA')).toBe(true)
    expect(
      db.turmas.filter((t) => t.anoLectivoId === 'ano-2026').every((t) => t.estado === 'ENCERRADA'),
    ).toBe(true)
    expect(
      db.percurso.some((p) => p.tipo === 'RESULTADO' && p.descricao === 'Reprovado na 7.ª classe'),
    ).toBe(true)

    expect(
      await screen.findByRole('button', { name: 'Reabrir o ano 2026/2027' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('O ano lectivo 2026/2027 está encerrado. Só é possível consultar.'),
    ).toBeInTheDocument()
  })

  it('reabrir pede o motivo e recusa enquanto houver outro ano em curso', async () => {
    renderizarEm('/anos-lectivos/ano-2025')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Reabrir o ano 2025/2026' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Reabrir o ano 2025/2026' })
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Reabrir' }))
    expect(
      await within(dialogo).findByText('Explique porque reabre (pelo menos 10 caracteres).'),
    ).toBeInTheDocument()
    await utilizador.type(
      within(dialogo).getByLabelText(/Motivo/),
      'Correcção de uma pauta da 9.ª B',
    )
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Reabrir' }))
    expect(
      await within(dialogo).findByText('Já há um ano lectivo em curso. Encerre-o primeiro.'),
    ).toBeInTheDocument()
    expect(ano('ano-2025').estado).toBe('ENCERRADO')
  })
})

describe('Abertura do ano seguinte', () => {
  it('cria o ano planeado, duplica as turmas e mostra o que falta por etapas', async () => {
    const { router } = renderizarEm('/anos-lectivos')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Criar o ano seguinte' }))
    const folha = await screen.findByRole('dialog', { name: 'Criar o ano 2027/2028' })
    await utilizador.click(within(folha).getByRole('button', { name: 'Criar 2027/2028' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/anos-lectivos/ano-2027'))
    expect(ano('ano-2027')).toMatchObject({ estado: 'PLANEADO', dataInicio: '2027-09-01' })
    const etapas = await screen.findByRole('list', { name: 'Etapas da abertura' })
    expect(
      within(etapas).getByText('3 trimestres gerados. Reveja feriados e datas-chave.'),
    ).toBeInTheDocument()
    expect(
      within(etapas).getByText('Encerre primeiro o ano 2026/2027: só pode haver um em curso.'),
    ).toBeInTheDocument()
    expect(within(etapas).queryByRole('button', { name: 'Activar' })).toBeNull()

    await utilizador.click(within(etapas).getByRole('button', { name: 'Duplicar as turmas' }))
    expect(await within(etapas).findByText('12 turmas preparadas.')).toBeInTheDocument()
    expect(db.turmas.filter((t) => t.anoLectivoId === 'ano-2027')).toHaveLength(12)
    expect(screen.queryByRole('button', { name: 'Criar o ano seguinte' })).toBeNull()
  })

  it('activa o ano planeado quando o anterior já está encerrado', async () => {
    anosLectivos.push({
      id: 'ano-2027',
      designacao: '2027/2028',
      dataInicio: '2027-09-01',
      dataFim: '2028-07-31',
      estado: 'PLANEADO',
    })
    ano('ano-2026').estado = 'ENCERRADO'
    renderizarEm('/anos-lectivos/ano-2027')
    const utilizador = userEvent.setup()
    const etapas = await screen.findByRole('list', { name: 'Etapas da abertura' })
    await utilizador.click(within(etapas).getByRole('button', { name: 'Activar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Activar o ano 2027/2028' })
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Activar 2027/2028' }))
    await waitFor(() => expect(ano('ano-2027').estado).toBe('EM_CURSO'))
  })
})
