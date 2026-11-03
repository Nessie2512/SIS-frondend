import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { renderizarEm } from '@/test/renderizar'
import { handlersSis, meSis } from '@/test/sis'

/** Permissões que o backend devolve em /auth/me a cada perfil (core/auth/permissions.ts). */
const PERFIS = {
  SECRETARIO: [
    'students:read',
    'classes:read',
    'students:write',
    'student-entry:write',
    'student-approval:write',
    'academic:read',
  ],
  ADMIN: ['curriculum:read', 'curriculum:write', 'academic:read'],
  GESTOR_TI: ['users:read', 'users:write', 'audit:read'],
  CHEFE_SECRETARIA: [
    'students:read',
    'students:write',
    'student-entry:write',
    'student-approval:write',
    'student-management:write',
    'classes:read',
    'classes:write',
    'academic:read',
    'academic:write',
    'reports:read',
    'audit:read',
    'users:read',
    'users:write',
  ],
} as const

function entrarComo(papel: keyof typeof PERFIS) {
  server.use(
    http.get('/sis/auth/me', () =>
      HttpResponse.json({ ...meSis, role: papel, permissions: PERFIS[papel] }),
    ),
  )
}

async function menuPrincipal() {
  const menu = await screen.findByRole('navigation', { name: 'Principal' }, { timeout: 10_000 })
  return within(menu)
    .getAllByRole('link')
    .map((l) => l.textContent)
}

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('A interface adapta-se ao perfil de quem entrou', () => {
  it('secretário: só as áreas da secretaria que o servidor já tem', async () => {
    entrarComo('SECRETARIO')
    renderizarEm('/')
    expect(await menuPrincipal()).toEqual([
      'Início',
      'Estudantes',
      'Matrículas',
      'Turmas',
      'Professores',
      'Currículo',
    ])
    // A lista de matrículas já existe no servidor: Matrículas abre-a
    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(menu).getByRole('link', { name: 'Matrículas' })).toHaveAttribute(
      'href',
      '/matriculas?page=1',
    )
    expect(screen.getByRole('link', { name: 'Matricular estudante' })).toBeInTheDocument()
    const areas = screen.getByRole('heading', { name: 'As suas áreas' }).parentElement!
    expect(within(areas).queryByText('Anos lectivos')).toBeNull()
  })

  it('administrador: currículo, professores e anos lectivos; nada de estudantes', async () => {
    entrarComo('ADMIN')
    const { router } = renderizarEm('/estudantes?page=1')
    expect(await menuPrincipal()).toEqual(['Início', 'Professores', 'Currículo', 'Anos lectivos'])
    // Pelo endereço também não entra: volta ao início
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('link', { name: 'Matricular estudante' })).toBeNull()
  })

  it('gestor de TI: gere as contas nas definições, sem áreas da secretaria', async () => {
    entrarComo('GESTOR_TI')
    renderizarEm('/')
    expect(await menuPrincipal()).toEqual(['Início'])
    expect(
      screen.getByText('Contas dos utilizadores, perfis de acesso e preferências.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acções rápidas' })).toBeNull()

    const areas = screen.getByRole('heading', { name: 'As suas áreas' }).parentElement!
    await userEvent.setup().click(within(areas).getByRole('link', { name: /^Definições/ }))
    const seccoes = await screen.findByRole('navigation', { name: 'Secções das definições' })
    expect(
      within(seccoes)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Preferências', 'Utilizadores', 'Perfis de acesso'])
  })

  it('ficha do estudante: só o resumo e as acções que o servidor faz', async () => {
    entrarComo('CHEFE_SECRETARIA')
    renderizarEm('/estudantes/est-1?separador=percurso')
    expect(await screen.findByRole('heading', { name: 'João Baptista' }, { timeout: 10_000 }))
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Transferir' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Imprimir ficha' })).toBeInTheDocument()
    // A matrícula do ano vem de GET /enrollments?studentId
    expect(screen.getByText('7.ª classe · 7.ª A')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Situação' }))
    const opcoes = (await screen.findAllByRole('menuitem')).map((o) => o.textContent)
    expect(opcoes).toHaveLength(1)
    expect(opcoes[0]).toMatch(/^Anular o processo/)
  })
})
