import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useContextoAno } from '@/entities/ano-lectivo'
import { db } from '@/mocks/db'
import { desfazerUltima } from '@/shared/ui'
import { renderizarEm } from '@/test/renderizar'

describe('Calendário do ano lectivo', () => {
  it('cada dia diz a data por extenso, o trimestre e o que acontece', async () => {
    renderizarEm('/calendario')
    expect(await screen.findByRole('heading', { name: 'Calendário 2026/2027' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'quarta-feira, 11 de novembro de 2026, 1.º trimestre e Feriado: Dia da Independência Nacional',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument()
  })

  it('navega com o teclado: setas mudam de dia, PageDown muda de mês', async () => {
    renderizarEm('/calendario')
    const utilizador = userEvent.setup()
    const dia = await screen.findByRole('button', { name: /^quarta-feira, 11 de novembro de 2026/ })
    dia.focus()
    await waitFor(() => expect(dia).toHaveAttribute('tabindex', '0'))
    await utilizador.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('button', { name: /^quinta-feira, 12 de novembro de 2026/ }),
    ).toHaveFocus()
    await utilizador.keyboard('{ArrowDown}')
    expect(
      screen.getByRole('button', { name: /^quinta-feira, 19 de novembro de 2026/ }),
    ).toHaveFocus()
    await utilizador.keyboard('{PageDown}')
    expect(screen.getByRole('button', { name: /^sábado, 19 de dezembro de 2026/ })).toHaveFocus()
    // Só um dia está na ordem do Tab de cada vez
    expect(
      screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0'),
    ).toHaveLength(1)
  })

  it('escolher um dia abre a folha e permite acrescentar um evento', async () => {
    const { router } = renderizarEm('/calendario')
    const utilizador = userEvent.setup()
    await utilizador.click(
      await screen.findByRole('button', { name: /^segunda-feira, 19 de outubro de 2026/ }),
    )
    await waitFor(() => expect(router.state.location.search).toMatchObject({ dia: '2026-10-19' }))
    const folha = await screen.findByRole('dialog', {
      name: 'segunda-feira, 19 de outubro de 2026',
    })
    expect(within(folha).getByText('Sem eventos.')).toBeInTheDocument()

    await utilizador.click(within(folha).getByRole('button', { name: 'Acrescentar ao calendário' }))
    expect(await within(folha).findByText('Escreva o nome do evento.')).toBeInTheDocument()

    await utilizador.type(within(folha).getByLabelText(/Nome/), 'Feira de ciências')
    await utilizador.click(within(folha).getByRole('radio', { name: 'Data-chave' }))
    await utilizador.click(within(folha).getByRole('button', { name: 'Acrescentar ao calendário' }))

    expect(await within(folha).findByText('Feira de ciências')).toBeInTheDocument()
    const criado = db.eventos.find((e) => e.titulo === 'Feira de ciências')!
    expect(criado).toMatchObject({ tipo: 'DATA_CHAVE', inicio: '2026-10-19', fim: '2026-10-19' })
  })

  it('apagar um evento tem Desfazer; feriados nacionais não se apagam', async () => {
    renderizarEm('/calendario?dia=2026-10-10')
    const utilizador = userEvent.setup()
    const folha = await screen.findByRole('dialog')
    await utilizador.click(
      within(folha).getByRole('button', { name: 'Apagar «Reunião geral de encarregados»' }),
    )
    const existe = () =>
      db.eventos.some(
        (e) => e.titulo === 'Reunião geral de encarregados' && e.inicio === '2026-10-10',
      )
    await waitFor(() => expect(existe()).toBe(false))
    expect(desfazerUltima()).toBe(true)
    await waitFor(() => expect(existe()).toBe(true))

    await utilizador.keyboard('{Escape}')
    await utilizador.click(
      await screen.findByRole('button', { name: /^quarta-feira, 11 de novembro de 2026/ }),
    )
    const feriado = await screen.findByRole('dialog', {
      name: 'quarta-feira, 11 de novembro de 2026',
    })
    expect(within(feriado).getByLabelText('Feriado nacional: não se apaga')).toBeInTheDocument()
    expect(within(feriado).queryByRole('button', { name: /^Apagar/ })).toBeNull()
  })

  it('num ano encerrado o calendário fica só para consulta', async () => {
    useContextoAno.getState().escolher('ano-2025')
    renderizarEm('/calendario?dia=2025-10-10')
    const folha = await screen.findByRole('dialog')
    expect(
      within(folha).getByText('O ano lectivo está encerrado. O calendário fica só para consulta.'),
    ).toBeInTheDocument()
    expect(within(folha).queryByRole('button', { name: 'Acrescentar ao calendário' })).toBeNull()
  })
})
