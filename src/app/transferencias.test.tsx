import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRascunhoMatricula } from '@/features/matricular-estudante/model/rascunho'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

describe('Transferências', () => {
  beforeEach(() => useRascunhoMatricula.getState().limpar())

  it('saída: diz o efeito na turma, pede a escola e anula a matrícula', async () => {
    const estudante = db.estudantes[0]!
    const matricula = db.matriculas.find((m) => m.estudanteId === estudante.id)!
    const turmaId = matricula.turmaId!
    const inscritos = db.matriculas.filter(
      (m) => m.turmaId === turmaId && m.estado !== 'ANULADA',
    ).length
    renderizarEm(`/estudantes/${estudante.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Transferir' }))
    const folha = await screen.findByRole('dialog', { name: 'Transferir para outra escola' })
    expect(
      await within(folha).findByText(`Sai da turma 7.ª A, que fica com ${inscritos - 1} de 40.`),
    ).toBeInTheDocument()

    const transferir = within(folha).getByRole('button', { name: `Transferir ${estudante.nome}` })
    await utilizador.click(transferir)
    expect(await within(folha).findByText('Indique a escola de destino.')).toBeInTheDocument()
    await utilizador.type(
      within(folha).getByLabelText(/Escola de destino/),
      'Escola n.º 4012, Huambo',
    )
    await utilizador.type(within(folha).getByLabelText(/Motivo/), 'Mudança de residência')
    await utilizador.click(transferir)

    await waitFor(() => expect(estudante.estado).toBe('TRANSFERIDO'))
    expect(matricula.estado).toBe('ANULADA')
    expect(matricula.turmaId).toBeNull()
    const saida = db.percurso.find(
      (p) => p.estudanteId === estudante.id && p.tipo === 'TRANSFERENCIA',
    )!
    expect(saida).toMatchObject({
      descricao: 'Transferido para Escola n.º 4012, Huambo',
      motivo: 'Mudança de residência',
    })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Transferir' })).toBeNull())
  })

  it('entrada: a escola de origem e as classes concluídas entram no percurso', async () => {
    renderizarEm('/matriculas/nova')
    const utilizador = userEvent.setup()
    await utilizador.type(await screen.findByLabelText(/Nome completo/), 'Luzia Cambuta Ndala')
    await utilizador.type(screen.getByLabelText(/Data de nascimento/), '03/04/2011')
    await utilizador.tab()
    await utilizador.click(screen.getByRole('radio', { name: 'Feminino' }))
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))
    await utilizador.type(await screen.findByLabelText(/Nome completo/), 'Rosa Ndala')
    await utilizador.type(screen.getByLabelText(/Parentesco/), 'Mãe')
    await utilizador.type(screen.getByLabelText(/Telefone/), '923 444 555')
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))
    await screen.findByRole('heading', { name: 'Documentos' })
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))

    await screen.findByRole('heading', { name: 'Classe e turma' })
    await utilizador.click(await screen.findByRole('combobox', { name: /Classe/ }))
    await utilizador.click(await screen.findByRole('option', { name: /9\.ª classe/ }))
    await utilizador.click(screen.getByLabelText(/Vem transferido de outra escola/))
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))
    expect(await screen.findByText('Indique a escola de origem.')).toBeInTheDocument()
    await utilizador.type(screen.getByLabelText(/Escola de origem/), 'Colégio Kalandula')
    await utilizador.click(screen.getByLabelText('7.ª classe'))
    await utilizador.click(screen.getByLabelText('8.ª classe'))
    expect(screen.queryByLabelText('9.ª classe')).toBeNull()
    await utilizador.click(screen.getByRole('button', { name: 'Seguinte' }))

    expect(
      await screen.findByText('Colégio Kalandula · 7.ª classe · 8.ª classe'),
    ).toBeInTheDocument()
    await utilizador.click(screen.getByRole('button', { name: 'Matricular' }))
    await screen.findByRole('heading', { name: 'Matrícula de Luzia Cambuta Ndala registada' })

    const estudante = db.estudantes.find((e) => e.nome === 'Luzia Cambuta Ndala')!
    const doPercurso = db.percurso
      .filter((p) => p.estudanteId === estudante.id)
      .map((p) => p.descricao)
    expect(doPercurso).toEqual(
      expect.arrayContaining([
        'Concluiu a 7.ª classe em Colégio Kalandula',
        'Concluiu a 8.ª classe em Colégio Kalandula',
        'Transferido de Colégio Kalandula',
      ]),
    )
  })
})
