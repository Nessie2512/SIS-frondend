import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

const abrir = (id: string) => renderizarEm(`/estudantes/${id}?separador=encarregados`)

describe('Encarregados na ficha', () => {
  it('liga o encarregado de um irmão em vez de o criar outra vez', async () => {
    const irmao = db.estudantes[3]!
    const enc = db.encarregados.find((x) => x.id === irmao.encarregadoIds[0])!
    const estudante = db.estudantes[0]!
    abrir(estudante.id)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Acrescentar encarregado' }))
    const folha = await screen.findByRole('dialog', { name: 'Acrescentar encarregado' })
    await utilizador.type(
      within(folha).getByLabelText(/Procurar por nome ou telefone/),
      enc.telefone,
    )
    await utilizador.click(await within(folha).findByRole('radio', { name: new RegExp(enc.nome) }))
    await utilizador.click(within(folha).getByRole('button', { name: 'Ligar ao estudante' }))
    await waitFor(() => expect(estudante.encarregadoIds).toContain(enc.id))
    expect(enc.educandos).toContain(estudante.id)
    expect(db.encarregados.filter((x) => x.telefone === enc.telefone)).toHaveLength(1)
  })

  it('pessoa nova com um telefone já registado: oferece ligar a existente', async () => {
    const enc = db.encarregados[5]!
    const estudante = db.estudantes[0]!
    abrir(estudante.id)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Acrescentar encarregado' }))
    const folha = await screen.findByRole('dialog', { name: 'Acrescentar encarregado' })
    await utilizador.click(within(folha).getByRole('radio', { name: 'Pessoa nova' }))
    await utilizador.type(within(folha).getByLabelText(/Nome completo/), 'Outro Nome Qualquer')
    await utilizador.type(within(folha).getByLabelText(/Parentesco/), 'Tio')
    await utilizador.type(within(folha).getByLabelText(/Telefone/), enc.telefone)
    await utilizador.click(within(folha).getByRole('button', { name: 'Acrescentar' }))
    const deVolta = await screen.findByRole('dialog', { name: 'Acrescentar encarregado' })
    expect(
      await within(deVolta).findByText(
        new RegExp(`${enc.nome} já está registado com este telefone`),
      ),
    ).toBeInTheDocument()
    await utilizador.click(within(deVolta).getByRole('button', { name: `Ligar ${enc.nome}` }))
    await waitFor(() => expect(estudante.encarregadoIds).toContain(enc.id))
    expect(db.encarregados.some((x) => x.nome === 'Outro Nome Qualquer')).toBe(false)
  })

  it('edita os dados, torna principal e retira com Desfazer; o último não se retira', async () => {
    const estudante = db.estudantes[0]!
    const outro = db.encarregados.find((x) => !estudante.encarregadoIds.includes(x.id))!
    estudante.encarregadoIds.push(outro.id)
    outro.educandos.push(estudante.id)
    const [primeiro, segundo] = estudante.encarregadoIds.map((id) =>
      db.encarregados.find((x) => x.id === id)!,
    )
    abrir(estudante.id)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: `Editar ${segundo!.nome}` }))
    const folha = await screen.findByRole('dialog', { name: 'Editar encarregado' })
    const email = within(folha).getByLabelText(/Email/)
    await utilizador.clear(email)
    await utilizador.type(email, 'novo@mail.ao')
    await utilizador.click(within(folha).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(segundo!.email).toBe('novo@mail.ao'))

    await utilizador.click(
      await screen.findByRole('button', {
        name: `Tornar ${segundo!.nome} o encarregado principal`,
      }),
    )
    await waitFor(() => expect(estudante.encarregadoIds[0]).toBe(segundo!.id))

    await utilizador.click(await screen.findByRole('button', { name: `Retirar ${primeiro!.nome}` }))
    await waitFor(() => expect(estudante.encarregadoIds).not.toContain(primeiro!.id))
    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(estudante.encarregadoIds).toContain(primeiro!.id))
  })

  it('com um só encarregado, retirar fica desactivado com a razão', async () => {
    const estudante = db.estudantes.find((e) => e.encarregadoIds.length === 1)!
    const enc = db.encarregados.find((x) => x.id === estudante.encarregadoIds[0])!
    abrir(estudante.id)
    expect(await screen.findByRole('button', { name: `Retirar ${enc.nome}` })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})
