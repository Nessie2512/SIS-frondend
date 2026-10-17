import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

describe('Vistas guardadas', () => {
  it('aplicar uma vista põe os filtros no URL e assinala-a', async () => {
    const { router } = renderizarEm('/matriculas')
    const vistas = await screen.findByRole('list', { name: 'Vistas guardadas' })
    const vista = within(vistas).getByRole('button', { name: '7.ª classe sem turma' })
    expect(vista).toHaveAttribute('aria-pressed', 'false')

    await userEvent.setup().click(vista)
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ classeId: 'c7', semTurma: true }),
    )
    expect(vista).toHaveAttribute('aria-pressed', 'true')
    // Com uma vista igual aos filtros, não se oferece guardar outra
    expect(screen.queryByRole('button', { name: 'Guardar vista' })).toBeNull()
  })

  it('guarda os filtros actuais com um nome e permite apagar com Desfazer', async () => {
    renderizarEm('/estudantes?classeId=c8&estado=ACTIVO')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Guardar vista' }))
    const dialogo = await screen.findByRole('dialog')
    await utilizador.type(within(dialogo).getByLabelText(/Nome da vista/), '8.ª activos')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    const vista = await screen.findByRole('button', { name: '8.ª activos' })
    expect(vista).toHaveAttribute('aria-pressed', 'true')
    expect(db.vistas.find((v) => v.nome === '8.ª activos')?.filtros).toEqual({
      classeId: 'c8',
      estado: 'ACTIVO',
    })

    await utilizador.click(screen.getByRole('button', { name: 'Apagar a vista «8.ª activos»' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '8.ª activos' })).toBeNull())
    await waitFor(() => expect(db.vistas.some((v) => v.nome === '8.ª activos')).toBe(false))

    expect(desfazerUltima()).toBe(true)
    expect(await screen.findByRole('button', { name: '8.ª activos' })).toBeInTheDocument()
  })

  it('um nome repetido é explicado no próprio campo', async () => {
    renderizarEm('/matriculas?estado=PENDENTE')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Guardar vista' }))
    const dialogo = await screen.findByRole('dialog')
    await utilizador.type(within(dialogo).getByLabelText(/Nome da vista/), '7.ª classe sem turma')
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialogo).findByText('Já tem uma vista com este nome.')).toBeInTheDocument()
  })
})
