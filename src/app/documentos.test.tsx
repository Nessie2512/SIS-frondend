import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

/** Estudante com matrícula confirmada e turma no ano em curso, com nome único na base. */
function estudanteEmTurma() {
  const candidatos = db.matriculas
    .filter((x) => x.anoLectivoId === 'ano-2026' && x.estado === 'CONFIRMADA' && x.turmaId)
    .map((m) => db.estudantes.find((e) => e.id === m.estudanteId)!)
  return candidatos.find((e) => db.estudantes.filter((x) => x.nome === e.nome).length === 1)!
}

describe('Área Documentos', () => {
  it('emite a partir da área, lista todos os emitidos, filtra e anula', async () => {
    const estudante = estudanteEmTurma()
    renderizarEm('/documentos')
    const utilizador = userEvent.setup()
    expect(
      await screen.findByText('Ainda não foram emitidos documentos oficiais.'),
    ).toBeInTheDocument()

    // Primeiro o estudante, depois a folha de emissão da ficha
    await utilizador.click(screen.getByRole('button', { name: 'Emitir documento' }))
    const escolher = await screen.findByRole('dialog', { name: 'Emitir documento' })
    await utilizador.type(within(escolher).getByLabelText(/Estudante/), estudante.numeroProcesso)
    const encontrados = await within(escolher).findByRole('list', {
      name: 'Estudantes encontrados',
    })
    await utilizador.click(
      within(encontrados).getByRole('button', { name: new RegExp(estudante.nome) }),
    )

    const folha = await screen.findByRole('dialog', { name: 'Emitir documento' })
    expect(within(folha).getByText(estudante.nome)).toBeInTheDocument()
    await utilizador.click(within(folha).getByRole('radio', { name: /Declaração de matrícula/ }))
    await utilizador.click(within(folha).getByLabelText(/Revi o documento/))
    const emitir = within(folha).getByRole('button', { name: 'Emitir declaração' })
    await waitFor(() => expect(emitir).toBeEnabled())
    await utilizador.click(emitir)
    const emitido = await screen.findByRole('dialog', { name: 'Documento emitido' })
    await utilizador.click(within(emitido).getByRole('button', { name: 'Concluir' }))

    const tabela = await screen
      .findByRole('grid', { name: 'Documentos emitidos' })
      .catch(() => screen.findByRole('table', { name: 'Documentos emitidos' }))
    expect(await within(tabela).findByText('DM-2026/00001')).toBeInTheDocument()
    expect(within(tabela).getByText(estudante.nome)).toBeInTheDocument()
    expect(screen.getByText('1 documento emitido')).toBeInTheDocument()

    // Filtrar por estado: nenhum anulado ainda
    await utilizador.click(screen.getByRole('combobox', { name: 'Estado' }))
    await utilizador.click(await screen.findByRole('option', { name: 'Anulado' }))
    expect(await screen.findByText('Nenhum documento corresponde à pesquisa.')).toBeInTheDocument()
    await utilizador.click(screen.getByRole('link', { name: 'Limpar filtros' }))

    // Anular a partir da tabela: continua listado, com o motivo
    await utilizador.click(
      await screen.findByRole('button', { name: 'Anular Declaração de matrícula DM-2026/00001' }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: 'Anular Declaração de matrícula DM-2026/00001',
    })
    await utilizador.type(
      within(dialogo).getByLabelText(/Motivo/),
      'Emitido com a finalidade errada',
    )
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Anular' }))
    await waitFor(() => expect(dialogo).not.toBeInTheDocument(), { timeout: 3000 })
    expect(db.documentosOficiais[0]!.estado).toBe('ANULADO')
    const linha = (await screen.findByText('DM-2026/00001')).closest('tr')!
    expect(await within(linha).findByText('Anulado')).toBeInTheDocument()
    expect(within(linha).getByText('Emitido com a finalidade errada')).toBeInTheDocument()
  })

  it('não deixa emitir sem permissão', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm('/documentos')
    expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Emitir documento' })).not.toBeInTheDocument()
  })
})

describe('Emissão em lote', () => {
  it('mostra quem recebe e quem fica de fora, confirma e gera um PDF com um documento por página', async () => {
    const daTurma = db.matriculas.filter(
      (m) => m.turmaId === 'ano-2026-c7-A' && m.estado !== 'ANULADA',
    )
    const confirmadas = daTurma.filter((m) => m.estado === 'CONFIRMADA')
    const fora = db.estudantes.find((e) => e.id === confirmadas[0]!.estudanteId)!
    fora.estado = 'DESISTENTE'
    // Recebem os activos com matrícula confirmada; os pendentes ficam de fora, com a razão
    const n = confirmadas.filter(
      (m) => db.estudantes.find((e) => e.id === m.estudanteId)!.estado === 'ACTIVO',
    ).length

    renderizarEm('/documentos')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Emitir em lote' }))
    const folha = await screen.findByRole('dialog', { name: 'Emitir em lote' })
    expect(within(folha).getByText('Escolha a turma para ver quem recebe.')).toBeInTheDocument()
    await utilizador.click(within(folha).getByRole('combobox', { name: /Turma/ }))
    await utilizador.click(await screen.findByRole('option', { name: /^7\.ª A/ }))

    const recebem = await within(folha).findByRole('list', { name: 'Recebem' })
    expect(within(recebem).getAllByRole('listitem')).toHaveLength(n)
    const deFora = within(folha).getByRole('list', { name: 'Ficam de fora' })
    expect(deFora).toHaveTextContent(`${fora.nome}Não está activo.`)
    expect(within(deFora).getAllByRole('listitem')).toHaveLength(daTurma.length - n)

    const emitir = within(folha).getByRole('button', {
      name: `Emitir ${n} declarações de frequência`,
    })
    expect(emitir).toBeDisabled()
    await utilizador.click(within(folha).getByLabelText(/Revi quem recebe/))
    await waitFor(() => expect(emitir).toBeEnabled())
    await utilizador.click(emitir)

    const pdf = await within(folha).findByRole('link', { name: 'Descarregar PDF' })
    expect(db.documentosOficiais).toHaveLength(n)
    expect(new Set(db.documentosOficiais.map((d) => d.numero)).size).toBe(n)
    expect(within(folha).getByRole('list', { name: 'Sem documento' })).toHaveTextContent(
      `${fora.nome}: Não está activo; sem documento.`,
    )
    const resposta = await fetch(new URL(pdf.getAttribute('href')!, location.origin))
    expect(resposta.headers.get('Content-Type')).toBe('application/pdf')
    const texto = await resposta.text()
    expect(texto).toContain(`/Count ${n}`)
    expect(texto).toContain(db.documentosOficiais[n - 1]!.codigo)

    await utilizador.click(within(folha).getByRole('button', { name: 'Concluir' }))
    expect(await screen.findByText(`${n} documentos emitidos`)).toBeInTheDocument()
  })
})
