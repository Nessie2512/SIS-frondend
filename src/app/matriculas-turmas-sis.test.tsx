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

  it('sem rota para confirmar, o filtro «A confirmar» não aparece', async () => {
    renderizarEm('/matriculas?page=1')
    await screen.findByRole('table', { name: 'Matrículas' }, { timeout: 10_000 })
    expect(screen.getByRole('radio', { name: 'Confirmadas' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'A confirmar' })).toBeNull()
  })
})

describe('Impressão com o backend SIS', () => {
  it('lista nominal no modelo da escola: turma, director e contactos dos pais', async () => {
    const turma = turmasSis.find((t) => t.uuid === 'turma-7a')!
    turma.director = 'Mário Kiala'
    try {
      renderizarEm('/imprimir/turma/turma-7a')
      const lista = await screen.findByRole(
        'table',
        { name: 'Estudantes da turma 7.ª A' },
        { timeout: 10_000 },
      )
      expect(
        within(lista)
          .getAllByRole('columnheader')
          .map((c) => c.textContent),
      ).toEqual([
        'N.º',
        'Nome',
        'Código de estudante',
        'Idioma preferencial',
        'Contactos dos pais',
        'Nacionalidade',
      ])
      // O contacto do encarregado principal (a mãe) vem primeiro
      const linhas = within(lista).getAllByRole('row').slice(1)
      expect(linhas).toHaveLength(1)
      expect(
        within(linhas[0]!)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ).toEqual([
        '1',
        'João Baptista',
        'BMA20260001',
        'Português',
        '+244 923 000 002+244 923 000 001',
        'Angolana',
      ])
      expect(within(lista).queryByText('Conceição Neto')).toBeNull()
      expect(
        screen.getByText(/Turma: 7\.ª A\s*\|\s*Director de turma: Mário Kiala/),
      ).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Lista de estudantes' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Logótipo da escola' })).toBeInTheDocument()
    } finally {
      turma.director = null
    }
  })

  it('ficha do estudante: termo de matrícula com o encarregado principal e a turma', async () => {
    renderizarEm('/imprimir/estudante/est-1')
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Termo de matrícula e de aceitação do regulamento escolar' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument()
    const estudante = screen.getByRole('heading', {
      name: '1. Informação do estudante',
    }).parentElement!
    expect(estudante).toHaveTextContent(
      /Mãe actua na qualidade de encarregado de educação do estudante João Baptista, do sexo masculino/,
    )
    expect(estudante).toHaveTextContent(/código de estudante BMA20260001/)
    expect(estudante).toHaveTextContent(/matriculado em 7\.ª classe, turma 7\.ª A/)
    const encarregado = screen.getByRole('heading', {
      name: '2. Informação do encarregado de educação',
    }).parentElement!
    expect(encarregado).toHaveTextContent(
      /telefone principal \+244 923 000 002, pelo telefone alternativo \+244 923 000 001/,
    )
    // O BI do encarregado e o e-mail não existem no sistema: ficam para preencher à mão
    expect(within(encarregado).getAllByLabelText('por preencher')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Documentos' })).toBeNull()
  })
})

describe('Editar a turma no backend SIS (PATCH /classes/:id)', () => {
  it('guarda a sala em { room }', async () => {
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
        { metodo: 'PATCH', caminho: '/classes/turma-7a', corpo: { room: 'Sala 12' } },
      ]),
    )
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
        // O backend guarda o director pelo nome
        corpo: { director: 'Mário Kiala' },
      }),
    )
  })
})

describe('Estudantes e professores com includeUnused (dev 04/11)', () => {
  beforeEach(() => {
    // Sem a sobreposição do topo: a lista do fake segue o backend (includeUnused)
    server.use(...handlersSis())
    server.use(http.get('/sis/auth/me', () => HttpResponse.json({ ...meSis, permissions: CHEFE })))
  })

  it('a tabela traz todos os estudantes, com a matrícula de cada um', async () => {
    renderizarEm('/estudantes?page=1')
    const tabela = await screen.findByRole('table', { name: 'Estudantes' }, { timeout: 10_000 })
    expect(
      await within(tabela).findByRole('row', { name: /João Baptista .* 7\.ª classe · 7\.ª A/ }),
    )
    expect(within(tabela).getByRole('row', { name: /Conceição Neto .* 7\.ª classe · 7\.ª B/ }))
    // Ana não tem matrícula no ano: só vem com includeUnused
    expect(within(tabela).getByRole('row', { name: /Ana Domingos .* Sem matrícula neste ano/ }))
  })

  it('a ficha de quem ainda não tem matrícula abre (a lista do ano supre o 404)', async () => {
    renderizarEm('/estudantes/est-3')
    expect(
      await screen.findByRole('heading', { name: 'Ana Domingos' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Sem matrícula neste ano')).toBeInTheDocument()
  })

  it('a ficha mostra a matrícula do ano lida de GET /enrollments', async () => {
    renderizarEm('/estudantes/est-1')
    expect(
      await screen.findByRole('heading', { name: 'João Baptista' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('7.ª classe · 7.ª A')).toBeInTheDocument()
  })

  it('a lista de professores traz também quem ainda não tem turma', async () => {
    renderizarEm('/professores?page=1')
    const tabela = await screen.findByRole('table', { name: 'Professores' }, { timeout: 10_000 })
    expect(await within(tabela).findByText('Luísa Manuel')).toBeInTheDocument()
    expect(within(tabela).getByText('Mário Kiala')).toBeInTheDocument()
  })

  it('a ficha do professor mostra os dados pessoais', async () => {
    renderizarEm('/professores/prof-2')
    expect(
      await screen.findByRole('heading', { name: 'Luísa Manuel' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    for (const valor of [
      'Feminino',
      'Angolana',
      'Viana, Luanda',
      'Ciências e tecnologia',
      'Mestrado',
    ])
      expect(screen.getByText(valor)).toBeInTheDocument()
  })

  it('director geral: a ficha abre sem a matrícula (GET /enrollments dá-lhe 403)', async () => {
    server.use(
      http.get('/sis/auth/me', () =>
        HttpResponse.json({
          ...meSis,
          role: 'DIRECTOR_GERAL',
          permissions: ['students:read', 'classes:read', 'academic:read', 'reports:read'],
        }),
      ),
      http.get('/sis/enrollments', () =>
        HttpResponse.json(
          { title: 'Forbidden', status: 403, code: 'FORBIDDEN' },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    renderizarEm('/estudantes/est-1')
    expect(
      await screen.findByRole('heading', { name: 'João Baptista' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(menu).queryByRole('link', { name: 'Matrículas' })).toBeNull()
  })
})
