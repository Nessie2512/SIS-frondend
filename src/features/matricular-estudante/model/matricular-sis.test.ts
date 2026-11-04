import { QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas } from '@/test/hook-sis'
import { estudantesSis, handlersSis } from '@/test/sis'
import { VALORES_INICIAIS, type DadosMatricula } from './esquema'
import {
  matricularNoSis,
  paraNovoEstudanteSis,
  type MatriculaSisCache,
} from './matricular-sis'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

const dados = (alterar: Partial<DadosMatricula> = {}): DadosMatricula => ({
  ...VALORES_INICIAIS,
  estudante: {
    ...VALORES_INICIAIS.estudante,
    nome: 'Kiala Ngola Bento',
    dataNascimento: '2013-03-04',
    sexo: 'M',
    tipoDocumento: 'BI',
    documentoIdentificacao: '00999LA041',
    endereco: {
      streetAndNumber: 'Rua 1, n.º 10',
      neighborhood: 'Cazenga',
      municipality: 'Cazenga',
      province: 'Luanda',
    },
    nacionalidade: 'Angolana',
    fatherName: 'Pedro Bento',
    fatherContact: '923 111 222',
    motherName: 'Rosa Ngola',
    motherContact: '931 333 444',
    bestLanguage: 'Português',
    familyPrefix: 'FAM-BENTO',
  },
  encarregados: [
    {
      nome: 'Pedro Bento',
      parentesco: 'Pai',
      telefone: '923 111 222',
      email: '',
      principal: false,
    },
    { nome: 'Rosa Ngola', parentesco: 'Mãe', telefone: '931 333 444', email: '', principal: true },
  ],
  classeId: 'classe-7',
  turmaId: 'turma-7a',
  ...alterar,
})

const novo = {
  ...estudantesSis[0]!,
  id: 40,
  uuid: 'est-novo',
  name: 'Kiala Ngola Bento',
  birthDate: '04/03/2013',
  studentCode: null,
}

/**
 * Backend de 03/11: POST /students devolve o estudante criado, ainda sem código; a matrícula
 * directa (POST /enrollments) atribui-o, e a ficha do ano passa a trazê-lo.
 */
function backendQueCria() {
  const pedidos = escutarEscritas({ 'POST /students': novo })
  server.use(
    http.get('/sis/students/est-novo', ({ request }) => {
      if (!new URL(request.url).searchParams.get('academicYearId')) {
        return HttpResponse.json({ title: 'Bad Request', status: 400 }, { status: 400 })
      }
      const matriculado = pedidos.some((p) => p.caminho === '/enrollments')
      return HttpResponse.json({ ...novo, studentCode: matriculado ? 'BMA20260040' : null })
    }),
  )
  return pedidos
}

describe('assistente de matrícula no backend SIS', () => {
  it('mapeia pai, mãe, encarregado principal, documento e prefixo da família', () => {
    expect(paraNovoEstudanteSis(dados())).toMatchObject({
      name: 'Kiala Ngola Bento',
      birthDate: '2013-03-04',
      documentType: 'BI',
      documentNumber: '00999LA041',
      fatherName: 'Pedro Bento',
      fatherContact: '+244923111222',
      motherContact: '+244931333444',
      primaryGuardian: '+244931333444',
      nationality: 'Angolana',
      familyPrefix: 'FAM-BENTO',
      address: {
        streetAndNumber: 'Rua 1, n.º 10',
        neighborhood: 'Cazenga',
        municipality: 'Cazenga',
        province: 'Luanda',
      },
      bestLanguage: 'Português',
    })
  })

  it('sem encarregado principal, apresenta erro no passo dos encarregados', () => {
    const semPrincipal = dados({
      encarregados: dados().encarregados.map((enc) => ({ ...enc, principal: false })),
    })
    expect(() => paraNovoEstudanteSis(semPrincipal)).toThrow(
      expect.objectContaining({
        status: 422,
        errors: [expect.objectContaining({ campo: 'encarregados' })],
      }),
    )
  })

  it('cria o estudante e matricula-o na turma pelos ids numéricos', async () => {
    const pedidos = backendQueCria()
    const matricula = await matricularNoSis(new QueryClient(), dados(), 'ano-sis-2026')
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual([
      'POST /students',
      'POST /enrollments',
    ])
    expect(pedidos[1]?.corpo).toEqual({ studentId: 40, classId: 20, academicYearId: 1 })
    expect(matricula).toMatchObject({
      estudanteId: 'est-novo',
      numeroProcesso: 'BMA20260040',
      classe: '7.ª classe',
      turma: '7.ª A',
      estado: 'CONFIRMADA',
    })
  })

  it('quem não pode matricular (403) deixa o estudante criado e a matrícula a confirmar', async () => {
    backendQueCria()
    server.use(
      http.post('/sis/enrollments', () =>
        HttpResponse.json({ title: 'Forbidden', status: 403 }, { status: 403 }),
      ),
    )
    const matricula = await matricularNoSis(new QueryClient(), dados(), 'ano-sis-2026')
    expect(matricula.estado).toBe('PENDENTE')
  })

  it('sem turma escolhida, só cria o estudante', async () => {
    const pedidos = backendQueCria()
    const matricula = await matricularNoSis(
      new QueryClient(),
      dados({ turmaId: null }),
      'ano-sis-2026',
    )
    expect(pedidos.map((p) => p.caminho)).toEqual(['/students'])
    expect(matricula).toMatchObject({ estado: 'PENDENTE', turma: null })
    // Ainda sem matrícula, ainda sem código de estudante
    expect(matricula.numeroProcesso).toBe('')
  })

  it('servidor antigo sem corpo no POST /students: encontra o estudante na lista do ano', async () => {
    const pedidos = escutarEscritas({}, (pedido) => {
      if (pedido.caminho !== '/students') return
      server.use(
        http.get('/sis/students', () =>
          HttpResponse.json([...estudantesSis, { ...novo, studentCode: 'BMA20260040' }]),
        ),
        http.get('/sis/students/est-novo', ({ request }) => {
          if (!new URL(request.url).searchParams.get('academicYearId')) {
            return HttpResponse.json({ title: 'Bad Request', status: 400 }, { status: 400 })
          }
          const matriculado = pedidos.some((p) => p.caminho === '/enrollments')
          return HttpResponse.json({ ...novo, studentCode: matriculado ? 'BMA20260040' : null })
        }),
      )
    })
    await matricularNoSis(new QueryClient(), dados(), 'ano-sis-2026')
    expect(pedidos[1]?.corpo).toEqual({ studentId: 40, classId: 20, academicYearId: 1 })
  })

  it('turma cheia (409 CLASS_CAPACITY_EXCEEDED): explica e não dá a matrícula como feita', async () => {
    backendQueCria()
    server.use(
      http.post('/sis/enrollments', () =>
        HttpResponse.json(
          { title: 'Conflict', status: 409, code: 'CLASS_CAPACITY_EXCEEDED' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    await expect(matricularNoSis(new QueryClient(), dados(), 'ano-sis-2026')).rejects.toMatchObject(
      { status: 409, code: 'LOTACAO_ESGOTADA' },
    )
  })

  it('repetir após falha não cria um segundo perfil do estudante', async () => {
    const pedidos = backendQueCria()
    const cache: MatriculaSisCache = new Map()
    const qc = new QueryClient()
    server.use(
      http.post('/sis/enrollments', () =>
        HttpResponse.json(
          { title: 'Conflict', status: 409, code: 'CLASS_CAPACITY_EXCEEDED' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    await expect(matricularNoSis(qc, dados(), 'ano-sis-2026', cache)).rejects.toMatchObject({
      status: 409,
    })

    server.use(http.post('/sis/enrollments', () => new HttpResponse(null, { status: 201 })))
    await matricularNoSis(qc, dados(), 'ano-sis-2026', cache)

    expect(pedidos.filter((p) => p.caminho === '/students')).toHaveLength(1)
  })
})
