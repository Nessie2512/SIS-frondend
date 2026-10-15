import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderizarEm } from '@/test/renderizar'

describe('Turmas (com API simulada)', () => {
  it('lista as turmas activas do ano em curso', async () => {
    renderizarEm('/turmas')
    expect(await screen.findByRole('heading', { name: 'Turmas' })).toBeInTheDocument()
    expect(await screen.findByText('7.ª A')).toBeInTheDocument()
    expect(screen.getAllByRole('meter').length).toBeGreaterThan(0)
  })

  it('Enter abre o painel lateral da turma e o URL regista-o', async () => {
    const { router } = renderizarEm('/turmas')
    const linha = (await screen.findByText('7.ª A')).closest('tr')!
    linha.focus()
    fireEvent.keyDown(linha, { key: 'Enter' })
    expect(await screen.findByRole('dialog', { name: '7.ª A' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ turma: 'ano-2026-c7-A' })
  })

  it('volta ao padrão quando o URL traz um filtro inválido', async () => {
    const { router } = renderizarEm('/turmas?estado=XPTO&page=-3')
    expect(await screen.findByText('7.ª A')).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ estado: 'ACTIVA', page: 1 })
  })
})
