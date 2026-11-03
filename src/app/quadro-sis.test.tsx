import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas } from '@/test/hook-sis'
import { renderizarEm } from '@/test/renderizar'
import { estudantesSis, handlersSis, meSis } from '@/test/sis'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
  server.use(
    // Secretário: matricula (/enrollments), mas não gere turmas (sem classes:write)
    http.get('/sis/auth/me', () =>
      HttpResponse.json({
        ...meSis,
        role: 'SECRETARIO',
        permissions: [
          'students:read',
          'classes:read',
          'student-entry:write',
          'student-approval:write',
        ],
      }),
    ),
    // João está na 7.ª A; Conceição ainda não tem turma; Ana está inactiva
    http.get('/sis/students', ({ request }) => {
      const turma = new URL(request.url).searchParams.get('classId')
      if (turma === null) return HttpResponse.json(estudantesSis)
      return HttpResponse.json(turma === '20' ? [estudantesSis[0]] : [])
    }),
  )
})
afterEach(() => definirAreasReais([]))

async function abrirQuadro(classeId = 'classe-7') {
  renderizarEm(`/turmas/quadro?classeId=${classeId}`)
  return screen.findByRole('region', { name: 'Sem turma' }, { timeout: 20_000 })
}

describe('Quadro da turma no backend SIS', () => {
  it('mostra quem não tem turma e quem já está matriculado, que não se move', async () => {
    const semTurma = await abrirQuadro()
    expect(within(semTurma).getByText('Conceição Neto')).toBeInTheDocument()
    expect(within(semTurma).queryByText('Ana Domingos')).toBeNull()
    const turmaA = screen.getByRole('region', { name: '7.ª A' })
    expect(within(turmaA).getByText('João Baptista')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mover João Baptista para…' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Distribuir automaticamente' })).toBeNull()
  })

  it('colocar quem não tem turma matricula-o nela (POST /enrollments)', async () => {
    const pedidos = escutarEscritas()
    await abrirQuadro()
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: 'Mover Conceição Neto para…' }))
    await u.click(await screen.findByRole('menuitem', { name: /^7\.ª B/ }))

    expect(
      within(screen.getByRole('region', { name: '7.ª B' })).getByText('Conceição Neto'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(pedidos).toEqual([
        {
          metodo: 'POST',
          caminho: '/enrollments',
          corpo: { studentId: 2, classId: 21, academicYearId: 1 },
        },
      ]),
    )
  })

  it('sem a classe na pesquisa, abre na primeira classe do servidor', async () => {
    await abrirQuadro('c7')
    await waitFor(() => expect(window.location.search).not.toContain('c7'))
  })
})
