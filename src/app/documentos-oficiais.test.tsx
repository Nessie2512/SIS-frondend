import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

/** Estudante com matrícula confirmada e turma no ano em curso. */
function estudanteEmTurma() {
  const m = db.matriculas.find(
    (x) =>
      x.anoLectivoId === 'ano-2026' && x.estado === 'CONFIRMADA' && x.turmaId === 'ano-2026-c7-A',
  )!
  return db.estudantes.find((e) => e.id === m.estudanteId)!
}

describe('Documentos oficiais', () => {
  it('pré-visualiza, exige confirmação, emite com número e código e anula com motivo', async () => {
    const estudante = estudanteEmTurma()
    renderizarEm(`/estudantes/${estudante.id}?separador=oficiais`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Emitir documento' }))
    const folha = await screen.findByRole('dialog', { name: 'Emitir documento' })

    // A guia só existe depois de uma transferência: desactivada, com a razão
    const guia = within(folha).getByRole('radio', { name: /Guia de transferência/ })
    expect(guia).toBeDisabled()
    expect(guia).toHaveAccessibleDescription('Só depois de registar a transferência de saída.')

    const emitir = within(folha).getByRole('button', { name: 'Emitir declaração' })
    expect(emitir).toBeDisabled()
    await utilizador.click(within(folha).getByRole('radio', { name: /Declaração de frequência/ }))
    await utilizador.type(within(folha).getByLabelText(/Para efeitos de/), 'abono de família')
    const previa = within(folha).getByRole('region', { name: 'Pré-visualização do documento' })
    expect(
      await within(previa).findByText(
        /para efeitos de abono de família, que .*frequenta nesta escola a 7\.ª classe, turma 7\.ª A/,
      ),
    ).toBeInTheDocument()
    expect(emitir).toBeDisabled()
    await utilizador.click(within(folha).getByLabelText(/Revi o documento/))
    await waitFor(() => expect(emitir).toBeEnabled())
    await utilizador.click(emitir)

    const emitido = await screen.findByRole('dialog', { name: 'Documento emitido' })
    expect(within(emitido).getByText('DF-2026/00001')).toBeInTheDocument()
    const doc = db.documentosOficiais[0]!
    expect(within(emitido).getByText(doc.codigo)).toBeInTheDocument()
    expect(doc).toMatchObject({ tipo: 'DECLARACAO_FREQUENCIA', finalidade: 'abono de família' })

    // O PDF é um PDF a sério, com o número e o código
    const pdf = await fetch(new URL(`/api/v1/documentos-oficiais/${doc.id}/pdf`, location.origin))
    expect(pdf.headers.get('Content-Type')).toBe('application/pdf')
    const texto = await pdf.text()
    expect(texto.startsWith('%PDF-1.4')).toBe(true)
    expect(texto).toContain(doc.codigo)

    await utilizador.click(within(emitido).getByRole('button', { name: 'Concluir' }))
    const lista = await screen.findByRole('list', { name: 'Documentos emitidos' })
    await utilizador.click(
      within(lista).getByRole('button', { name: 'Anular Declaração de frequência DF-2026/00001' }),
    )
    const dialogo = await screen.findByRole('dialog', { name: /^Anular Declaração de frequência/ })
    await utilizador.type(
      within(dialogo).getByLabelText(/Motivo/),
      'Emitida com a finalidade errada',
    )
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Anular' }))
    await waitFor(() => expect(doc.estado).toBe('ANULADO'))
    expect(
      await within(lista).findByText('Motivo da anulação: Emitida com a finalidade errada'),
    ).toBeInTheDocument()
    expect(within(lista).getByText('Anulado')).toBeInTheDocument()
  })

  it('depois da transferência, só a guia fica disponível', async () => {
    const estudante = estudanteEmTurma()
    estudante.estado = 'TRANSFERIDO'
    for (const m of db.matriculas) if (m.estudanteId === estudante.id) m.estado = 'ANULADA'
    renderizarEm(`/estudantes/${estudante.id}?separador=oficiais`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Emitir documento' }))
    const folha = await screen.findByRole('dialog', { name: 'Emitir documento' })
    expect(within(folha).getByRole('radio', { name: /Guia de transferência/ })).toBeEnabled()
    expect(within(folha).getByRole('radio', { name: /Declaração de matrícula/ })).toBeDisabled()
    await utilizador.click(within(folha).getByRole('radio', { name: /Guia de transferência/ }))
    expect(within(folha).getByRole('button', { name: 'Emitir guia' })).toBeInTheDocument()
  })
})
