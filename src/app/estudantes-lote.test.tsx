import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/mocks/db'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

const caixas = () => screen.getAllByRole('checkbox', { name: /^Seleccionar (?!todas)/ })

describe('Estudantes: selecção múltipla e acções em lote', () => {
  afterEach(() => vi.restoreAllMocks())

  it('exporta os seleccionados de várias páginas e emite declarações com o efeito antes', async () => {
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blobs.push(b as Blob)
      return 'blob:teste'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    renderizarEm('/estudantes')
    const utilizador = userEvent.setup()
    await screen.findAllByRole('checkbox', { name: /^Seleccionar (?!todas)/ })
    const [a, b] = caixas()
    const nomeA = a!.getAttribute('aria-label')!.replace('Seleccionar ', '')
    await utilizador.click(a!)
    await utilizador.click(b!)
    const barra = screen.getByRole('toolbar', { name: 'Acções em lote' })
    expect(within(barra).getByText('2 seleccionados')).toBeInTheDocument()

    // A selecção sobrevive à mudança de página
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))
    await screen.findByText(/^Página 2 de \d+$/)
    const outra = caixas()[0]!
    const nomeC = outra.getAttribute('aria-label')!.replace('Seleccionar ', '')
    await waitFor(() => expect(outra).not.toBeChecked())
    await utilizador.click(outra)
    expect(within(barra).getByText('3 seleccionados')).toBeInTheDocument()

    await utilizador.click(within(barra).getByRole('button', { name: 'Exportar CSV' }))
    const csv = await blobs[0]!.text()
    const linhas = csv.replace(/^\uFEFF/, '').split('\r\n')
    expect(linhas[0]).toBe(
      'Processo;Nome;Data de nascimento;Situação;Matrícula;Documentos em falta',
    )
    expect(linhas).toHaveLength(4)
    expect(csv).toContain(nomeA)
    expect(csv).toContain(nomeC)

    await utilizador.click(within(barra).getByRole('button', { name: 'Emitir declarações' }))
    const folha = await screen.findByRole('dialog', { name: 'Emitir em lote' })
    expect(
      within(folha).getByText('Declarações para os 3 estudantes seleccionados, num só PDF.'),
    ).toBeInTheDocument()
    expect(within(folha).queryByRole('combobox', { name: /Turma/ })).not.toBeInTheDocument()
    const recebem = await within(folha).findByRole('list', { name: 'Recebem' })
    const incluidos = within(recebem).getAllByRole('listitem').length
    const fora = within(folha).queryAllByRole('list', { name: 'Ficam de fora' })
    const excluidos = fora.length ? within(fora[0]!).getAllByRole('listitem').length : 0
    expect(incluidos + excluidos).toBe(3)

    await utilizador.click(within(folha).getByLabelText(/Revi quem recebe/))
    const emitir = within(folha).getByRole('button', { name: /^Emitir \d declaraç/ })
    await waitFor(() => expect(emitir).toBeEnabled())
    await utilizador.click(emitir)
    expect(await within(folha).findByRole('link', { name: 'Descarregar PDF' })).toBeInTheDocument()
    expect(db.documentosOficiais).toHaveLength(incluidos)
    await utilizador.click(within(folha).getByRole('button', { name: 'Concluir' }))
    // Concluir limpa a selecção
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Acções em lote' })).not.toBeInTheDocument(),
    )
  })

  it('quem só consulta exporta, mas não emite', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm('/estudantes')
    const utilizador = userEvent.setup()
    await screen.findAllByRole('checkbox', { name: /^Seleccionar (?!todas)/ })
    await utilizador.click(caixas()[0]!)
    const barra = screen.getByRole('toolbar', { name: 'Acções em lote' })
    expect(within(barra).getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument()
    expect(
      within(barra).queryByRole('button', { name: 'Emitir declarações' }),
    ).not.toBeInTheDocument()
  })
})
