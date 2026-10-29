import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/node'
import { ApiError, sessao } from '@/shared/api'
import { apiSis } from './client'
import { paraErroDeCampo, problemaDoSis } from './erros'

/** Forma real das respostas de erro do backend SIS (observada em /grades e /students/enroll). */
const erroNest = (status: number, message: string | string[], error: string) =>
  HttpResponse.json(
    {
      statusCode: status,
      timestamp: '2026-10-28T10:00:00.000Z',
      path: '/grades',
      error: { message, error, statusCode: status },
    },
    { status },
  )

describe('problemaDoSis', () => {
  it('converte a lista do class-validator em erros por campo', () => {
    const problema = problemaDoSis(400, {
      error: { message: ['name should not be empty', 'academicLevelId must be a number'] },
    })
    expect(problema.errors.map((e) => e.campo)).toEqual(['name', 'academicLevelId'])
    expect(problema.detail).toBeUndefined()
  })

  it('uma só mensagem fica como detalhe', () => {
    const problema = problemaDoSis(404, {
      statusCode: 404,
      error: { message: 'Student not found', error: 'Not Found', statusCode: 404 },
    })
    expect(problema).toMatchObject({ title: 'Not Found', detail: 'Student not found', errors: [] })
  })

  it('aceita também o formato padrão do Nest e corpos vazios', () => {
    expect(problemaDoSis(401, { message: 'Unauthorized', statusCode: 401 }).detail).toBe(
      'Unauthorized',
    )
    expect(problemaDoSis(500, null).title).toBe('Pedido falhou (500)')
  })

  it('lê campos compostos', () => {
    expect(paraErroDeCampo('address.city should not be empty').campo).toBe('address.city')
    expect(paraErroDeCampo('Algo falhou').campo).toBe('Algo')
  })
})

describe('apiSis', () => {
  it('envia o token da sessão e desembrulha { success, data }', async () => {
    sessao.definirToken('abc')
    let autorizacao: string | null = null
    server.use(
      http.get('/sis/academic-levels', ({ request }) => {
        autorizacao = request.headers.get('Authorization')
        return HttpResponse.json({ success: true, data: [{ id: 1, name: 'I Ciclo' }] })
      }),
    )
    const { data } = await apiSis.GET('/academic-levels')
    expect(autorizacao).toBe('Bearer abc')
    expect(data).toEqual([{ id: 1, name: 'I Ciclo' }])
  })

  it('deixa intactas as respostas sem envelope', async () => {
    server.use(http.get('/sis/academic-years', () => HttpResponse.json([{ uuid: 'a' }])))
    const { data } = await apiSis.GET('/academic-years')
    expect(data).toEqual([{ uuid: 'a' }])
  })

  it('erro de validação vira ApiError com erros por campo', async () => {
    server.use(
      http.post('/sis/grades', () => erroNest(400, ['name must be a string'], 'Bad Request')),
    )
    const erro = await apiSis.POST('/grades', { body: {} as never }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as ApiError).errors).toEqual([
      { campo: 'name', mensagem: 'name must be a string' },
    ])
  })

  it('401 na entrada são credenciais inválidas e não termina a sessão', async () => {
    sessao.definirToken(null)
    const fim = vi.fn()
    const desligar = sessao.aoTerminar(fim)
    server.use(
      http.post('/sis/auth/login', () => erroNest(401, 'Invalid credentials', 'Unauthorized')),
    )
    const erro = (await apiSis
      .POST('/auth/login', { body: { email: 'a@b.ao', password: 'x' } })
      .catch((e: unknown) => e)) as ApiError
    expect(erro.status).toBe(401)
    expect(erro.temCodigo('CREDENCIAIS_INVALIDAS')).toBe(true)
    expect(fim).not.toHaveBeenCalled()
    desligar()
  })

  it('401 noutro pedido com sessão aberta termina-a como expirada', async () => {
    sessao.definirToken('vencido')
    const fim = vi.fn()
    const desligar = sessao.aoTerminar(fim)
    server.use(http.get('/sis/students', () => erroNest(401, 'Unauthorized', 'Unauthorized')))
    await apiSis.GET('/students').catch(() => undefined)
    expect(fim).toHaveBeenCalledWith('expirada')
    expect(sessao.tokenAcesso()).toBeNull()
    desligar()
  })
})
