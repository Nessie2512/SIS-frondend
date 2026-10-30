import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { contasQuery, perfisQuery } from '@/entities/administracao'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { ciclosQuery, classesQuery } from '@/entities/classe'
import { disciplinasQuery } from '@/entities/disciplina'
import { estudanteQuery, estudantesQuery } from '@/entities/estudante'
import { professoresQuery, professorQuery } from '@/entities/professor'
import { turmaQuery, turmasQuery } from '@/entities/turma'
import { server } from '@/mocks/node'
import { sessao } from '@/shared/api'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { renderizarEm } from '@/test/renderizar'
import { handlersSis } from '@/test/sis'
import { criarQueryClient } from './query-client'

// Staging: todas as áreas no backend SIS, sem simulação
beforeEach(() => {
  definirAreasReais(AREAS_API)
  sessao.definirToken(null)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

const cliente = () => criarQueryClient()

describe('API real: referência', () => {
  it('anos lectivos com estado e datas a partir de startYear, por ordem cronológica', async () => {
    const anos = await cliente().fetchQuery(anosLectivosQuery())
    expect(anos.map((a) => [a.id, a.estado, a.dataInicio, a.dataFim])).toEqual([
      ['ano-sis-2025', 'ENCERRADO', '2025-09-01', '2026-07-31'],
      ['ano-sis-2026', 'EM_CURSO', '2026-09-01', '2027-07-31'],
    ])
    expect(anos[0]?.soLeitura).toBe(true)
  })

  it('classes ligadas ao ciclo pelo id numérico, ordenadas pelo número do nome', async () => {
    const classes = await cliente().fetchQuery(classesQuery())
    expect(classes.map((c) => [c.designacao, c.ciclo, c.ordem, c.activa])).toEqual([
      ['7.ª classe', 'I Ciclo', 7, true],
      ['8.ª classe', 'I Ciclo', 8, true],
      ['10.ª classe', 'II Ciclo', 10, false],
    ])
  })

  it('árvore de ciclos conta as turmas de cada classe', async () => {
    const ciclos = await cliente().fetchQuery(ciclosQuery())
    expect(ciclos.map((c) => c.designacao)).toEqual(['I Ciclo', 'II Ciclo'])
    const setima = ciclos[0]!.classes[0]!
    expect(setima).toMatchObject({ designacao: '7.ª classe', turmas: 3, planos: 1 })
  })

  it('disciplinas: em uso quando alguma classe as tem', async () => {
    const disciplinas = await cliente().fetchQuery(disciplinasQuery())
    expect(disciplinas.map((d) => [d.nome, d.sigla, d.emUso])).toEqual([
      ['Língua Portuguesa', 'LP', false],
      ['Matemática', 'MAT', true],
    ])
  })
})

describe('API real: turmas', () => {
  it('filtra pelo ano e pelo estado, com classe e turno traduzidos', async () => {
    const pagina = await cliente().fetchQuery(
      turmasQuery({ anoLectivoId: 'ano-sis-2026', estado: 'ACTIVA', page: 1 }),
    )
    expect(pagina.total).toBe(2)
    expect(pagina.turmas.map((t) => [t.designacao, t.classe, t.turnoRotulo])).toEqual([
      ['7.ª A', '7.ª classe', 'Manhã'],
      ['7.ª B', '7.ª classe', 'Tarde'],
    ])
    // Sem lotação no backend: a turma nunca aparece como cheia
    expect(pagina.turmas.every((t) => !t.turmaCheia)).toBe(true)
  })

  it('turmas inactivas contam como encerradas; detalhe pelo uuid', async () => {
    const c = cliente()
    const encerradas = await c.fetchQuery(
      turmasQuery({ anoLectivoId: 'ano-sis-2026', estado: 'ENCERRADA', page: 1 }),
    )
    expect(encerradas.turmas.map((t) => [t.designacao, t.turno])).toEqual([['8.ª A', 'INTEGRAL']])
    await expect(c.fetchQuery(turmaQuery('turma-7b'))).resolves.toMatchObject({
      classe: '7.ª classe',
    })
    await expect(c.fetchQuery(turmaQuery('nao-existe'))).rejects.toMatchObject({ status: 404 })
  })
})

describe('API real: estudantes', () => {
  const filtros = { anoLectivoId: 'ano-sis-2026', page: 1 }

  it('pesquisa sem acentos, filtra por sexo e estado, ordena por nome', async () => {
    const c = cliente()
    const todos = await c.fetchQuery(estudantesQuery(filtros))
    expect(todos.estudantes.map((e) => e.nome)).toEqual([
      'Ana Domingos',
      'Conceição Neto',
      'João Baptista',
    ])
    const pesquisa = await c.fetchQuery(estudantesQuery({ ...filtros, pesquisa: 'conceicao' }))
    expect(pesquisa.estudantes.map((e) => e.nome)).toEqual(['Conceição Neto'])
    const activas = await c.fetchQuery(estudantesQuery({ ...filtros, sexo: 'F', estado: 'ACTIVO' }))
    expect(activas.estudantes.map((e) => e.nome)).toEqual(['Conceição Neto'])
  })

  it('filtros de matrícula não têm dados no backend: lista vazia em vez de enganar', async () => {
    const pagina = await cliente().fetchQuery(estudantesQuery({ ...filtros, semTurma: true }))
    expect(pagina.total).toBe(0)
  })

  it('ficha: datas dd/mm/aaaa e ISO, documento e estado', async () => {
    const c = cliente()
    const joao = await c.fetchQuery(estudanteQuery('est-1'))
    expect(joao).toMatchObject({
      dataNascimento: '2013-05-15',
      documentoIdentificacao: 'BI 001LA04',
      telefone: '+244923000002',
      estado: 'ACTIVO',
    })
    expect((await c.fetchQuery(estudanteQuery('est-2'))).dataNascimento).toBe('2012-04-12')
    const ana = await c.fetchQuery(estudanteQuery('est-3'))
    expect(ana).toMatchObject({ estado: 'ANULADO', documentoIdentificacao: null })
  })
})

describe('API real: professores e contas', () => {
  it('ficha com as atribuições do ano em contexto, ligadas a turma e disciplina', async () => {
    const c = cliente()
    const lista = await c.fetchQuery(professoresQuery({ anoLectivoId: 'ano-sis-2026' }))
    expect(lista.professores.map((p) => [p.nome, p.disciplinasTexto])).toEqual([
      ['Mário Kiala', 'Ciências Exactas'],
    ])
    const prof = await c.fetchQuery(professorQuery('prof-1', 'ano-sis-2026'))
    expect(prof.atribuicoes).toEqual([
      expect.objectContaining({ turma: '7.ª A', classe: '7.ª classe', disciplina: 'Matemática' }),
    ])
    expect(prof.habilitacao).toBe('Licenciatura em Matemática')
  })

  it('contas com o papel em português; perfis contam os utilizadores', async () => {
    const c = cliente()
    const contas = await c.fetchQuery(contasQuery({}))
    expect(contas.map((x) => [x.nome, x.perfil, x.estado])).toEqual([
      ['Bento Secretário', 'Secretário', 'INACTIVO'],
      ['Domingas Chefe', 'Chefe da secretaria', 'ACTIVO'],
    ])
    const perfis = await c.fetchQuery(perfisQuery())
    expect(perfis.find((p) => p.id === 'SECRETARIO')?.utilizadores).toBe(1)
  })
})

describe('API real: ecrãs', () => {
  it('a lista de turmas abre com os dados do backend, recuperando a sessão pelo cookie', async () => {
    renderizarEm('/turmas')
    const tabela = await screen.findByRole('table')
    expect(await within(tabela).findByText('7.ª B')).toBeInTheDocument()
    expect(within(tabela).getAllByText('7.ª classe').length).toBeGreaterThan(0)
  })

  it('o que o backend ainda não tem diz que não está disponível', async () => {
    renderizarEm('/calendario')
    expect(
      await screen.findByText(/ainda não está disponível no servidor/, undefined, {
        timeout: 10_000,
      }),
    ).toBeInTheDocument()
  })
})
