import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas } from '@/test/hook-sis'
import { renderizarEm } from '@/test/renderizar'
import { estudantesSis, handlersSis, meSis, turmasSis } from '@/test/sis'

/** Chefe da secretaria: lê e escreve estudantes e turmas. */
const CHEFE = [
  'students:read',
  'students:write',
  'student-entry:write',
  'student-approval:write',
  'student-management:write',
  'classes:read',
  'classes:write',
  'academic:read',
  'academic:write',
]

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
  server.use(
    http.get('/sis/auth/me', () => HttpResponse.json({ ...meSis, permissions: CHEFE })),
    // Só João está na 7.ª A (classId 20)
    http.get('/sis/students', ({ request }) => {
      const turma = new URL(request.url).searchParams.get('classId')
      if (!turma) return HttpResponse.json(estudantesSis)
      return HttpResponse.json(turma === '20' ? [estudantesSis[0]] : [])
    }),
  )
})
afterEach(() => definirAreasReais([]))

describe('Matrículas no backend SIS (GET /enrollments)', () => {
  it('lista as matrículas do ano com classe, turma e estado; sem documentos nem renovação', async () => {
    renderizarEm('/matriculas?page=1')
    const tabela = await screen.findByRole('table', { name: 'Matrículas' }, { timeout: 10_000 })
    expect(within(tabela).getByRole('row', { name: /João Baptista .* 7\.ª A Confirmada/ }))
    expect(within(tabela).getByRole('row', { name: /Conceição Neto .* 7\.ª B Confirmada/ }))
    expect(within(tabela).queryByRole('columnheader', { name: 'Documentos' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Renovar em lote' })).toBeNull()
    expect(screen.queryByRole('radio', { name: 'Sem turma' })).toBeNull()
  })

  it('«A confirmar» mostra as confirmações à espera de pagamento', async () => {
    renderizarEm('/matriculas?page=1&estado=PENDENTE')
    const tabela = await screen.findByRole('table', { name: 'Matrículas' }, { timeout: 10_000 })
    expect(await within(tabela).findByRole('row', { name: /Ana Domingos .* A confirmar/ }))
    expect(within(tabela).queryByText('João Baptista')).toBeNull()
  })
})

describe('Impressão com o backend SIS', () => {
  it('lista nominal: os estudantes matriculados na turma', async () => {
    renderizarEm('/imprimir/turma/turma-7a')
    const lista = await screen.findByRole(
      'table',
      { name: 'Estudantes da turma 7.ª A' },
      { timeout: 10_000 },
    )
    expect(within(lista).getByRole('row', { name: /1 BMA20260001 João Baptista/ }))
    expect(within(lista).queryByText('Conceição Neto')).toBeNull()
  })

  it('ficha do estudante: dados, matrícula do ano, pai e mãe; sem documentos nem percurso', async () => {
    renderizarEm('/imprimir/estudante/est-1')
    expect(
      await screen.findByRole('heading', { name: 'Ficha do estudante' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/7\.ª classe · 7\.ª A/)).toBeInTheDocument()
    const encarregados = screen.getByRole('heading', {
      name: 'Encarregados de educação',
    }).parentElement!
    expect(within(encarregados).getByText('Pai')).toBeInTheDocument()
    expect(within(encarregados).getByText('Mãe')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Documentos' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Percurso' })).toBeNull()
  })
})

describe('Editar a turma no backend SIS (PATCH /classes/:id)', () => {
  it('guarda a sala com o updatedAt lido', async () => {
    const pedidos = escutarEscritas({}, (pedido) => {
      const corpo = pedido.corpo as { room?: string }
      const turma = turmasSis.find((t) => t.uuid === 'turma-7a')!
      if (corpo.room !== undefined) turma.room = corpo.room
    })
    renderizarEm('/turmas?turma=turma-7a')
    const u = userEvent.setup()
    const painel = await screen.findByRole('dialog', { name: '7.ª A' }, { timeout: 10_000 })
    await u.click(await within(painel).findByRole('button', { name: /^Editar Sala/ }))
    await u.type(within(painel).getByLabelText('Sala'), 'Sala 12')
    await u.tab()
    expect(
      await within(painel).findByRole('button', { name: 'Editar Sala: Sala 12' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(pedidos).toEqual([
        {
          metodo: 'PATCH',
          caminho: '/classes/turma-7a',
          corpo: { room: 'Sala 12', expectedUpdatedAt: '2026-11-03T10:00:00.000Z' },
        },
      ]),
    )
  })

  it('se outra pessoa mudou a turma, mostra o conflito', async () => {
    server.use(
      http.patch('/sis/classes/:id', () =>
        HttpResponse.json(
          { title: 'Conflict', status: 409, code: 'CLASS_MODIFIED', detail: 'CLASS_MODIFIED' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    renderizarEm('/turmas?turma=turma-7b')
    const u = userEvent.setup()
    const painel = await screen.findByRole('dialog', { name: '7.ª B' }, { timeout: 10_000 })
    await u.click(await within(painel).findByRole('button', { name: /^Editar Sala/ }))
    await u.type(within(painel).getByLabelText('Sala'), 'Sala 3{Enter}')
    expect(
      await screen.findByRole('dialog', { name: 'Outra pessoa alterou este dado' }),
    ).toBeInTheDocument()
  })

  it('o director de turma escolhe-se entre os professores da turma', async () => {
    const pedidos = escutarEscritas()
    renderizarEm('/turmas?turma=turma-7a')
    const u = userEvent.setup()
    const painel = await screen.findByRole('dialog', { name: '7.ª A' }, { timeout: 10_000 })
    await u.click(await within(painel).findByRole('button', { name: /^Editar Director de turma/ }))
    const opcoes = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(opcoes).toEqual(['Sem director de turma', expect.stringMatching(/^Mário Kiala/)])
    await u.click(screen.getByRole('option', { name: /Mário Kiala/ }))
    await waitFor(() =>
      expect(pedidos[0]).toMatchObject({
        metodo: 'PATCH',
        caminho: '/classes/turma-7a',
        corpo: { classDirectorTeacherId: 50 },
      }),
    )
  })
})
