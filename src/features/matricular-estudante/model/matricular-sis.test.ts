import { QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas } from '@/test/hook-sis'
import { estudantesSis, handlersSis } from '@/test/sis'
import { VALORES_INICIAIS, type DadosMatricula } from './esquema'
import { matricularNoSis, paraNovoEstudanteSis } from './matricular-sis'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

const dados = (alterar: Partial<DadosMatricula> = {}): DadosMatricula => ({
  ...VALORES_INICIAIS,
  estudante: {
    nome: 'Kiala Ngola Bento',
    dataNascimento: '2013-03-04',
    sexo: 'M',
    documentoIdentificacao: 'BI 00999LA041',
    telefone: '',
    morada: 'Cazenga, Luanda',
    naturalidade: 'Luanda',
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

/** O backend real responde sem corpo; o estudante novo aparece na lista seguinte. */
function backendQueCria() {
  return escutarEscritas({}, (pedido) => {
    if (pedido.caminho !== '/students') return
    const novo = { ...estudantesSis[0]!, id: 40, uuid: 'est-novo', studentCode: 'BMA20260040' }
    server.use(
      http.get('/sis/students', () =>
        HttpResponse.json([
          ...estudantesSis,
          { ...novo, name: 'Kiala Ngola Bento', birthDate: '04/03/2013' },
        ]),
      ),
    )
  })
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
    })
  })

  it('sem pai ou mãe, pára no passo dos encarregados com o motivo', () => {
    const soMae = dados({ encarregados: [dados().encarregados[1]!] })
    expect(() => paraNovoEstudanteSis(soMae)).toThrow(
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
      'POST /students/enroll',
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
      http.post('/sis/students/enroll', () =>
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
  })
})
