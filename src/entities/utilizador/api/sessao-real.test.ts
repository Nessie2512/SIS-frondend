import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/node'
import { ApiError, sessao } from '@/shared/api'
import { apiSis, type DtoSis } from '@/shared/api/sis'
import { definirAreasReais } from '@/shared/config/ligacao'
import { jwtDeTeste } from '@/test/jwt'
import { entrar, garantirSessao, meQuery, sair } from './queries'

const token = (n = 1) =>
  jwtDeTeste({ sub: 'u-chefe', n, exp: Math.floor(Date.now() / 1000) + 3600 })

const me = (dados: Partial<DtoSis<'MeResponseDto'>> = {}): DtoSis<'MeResponseDto'> => ({
  uuid: 'u-chefe',
  name: 'Domingas Chefe',
  email: 'chefe@escola.ao',
  role: 'CHEFE_SECRETARIA',
  permissions: ['students:read', 'student-entry:write', 'academic-years:write'],
  ...dados,
})

const erroNest = (status: number, message: string) =>
  HttpResponse.json({ statusCode: status, error: { message, statusCode: status } }, { status })

function backend(perfil = me()) {
  const pedidos: { caminho: string; corpo?: unknown }[] = []
  server.use(
    http.post('/sis/auth/login', async ({ request }) => {
      pedidos.push({ caminho: 'login', corpo: await request.json() })
      return HttpResponse.json({ accessToken: token(), tokenType: 'Bearer', expiresIn: 3600 })
    }),
    http.get('/sis/auth/me', ({ request }) =>
      request.headers.get('Authorization')?.startsWith('Bearer ')
        ? HttpResponse.json(perfil)
        : erroNest(401, 'A bearer access token is required.'),
    ),
    http.post('/sis/auth/logout', () => {
      pedidos.push({ caminho: 'logout' })
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return pedidos
}

const meAgora = () =>
  (meQuery().queryFn as (c: { signal: AbortSignal }) => unknown)({
    signal: new AbortController().signal,
  })

// Área "sessao" ligada ao backend SIS real; as outras ficam no MSW (modo híbrido).
// O setup dos testes abre uma sessão simulada (tk-u1); aqui começa-se sem nenhuma
beforeEach(() => {
  definirAreasReais(['sessao'])
  sessao.definirToken(null)
})
afterEach(() => definirAreasReais([]))

describe('sessão no backend SIS', () => {
  it('entra com { email, password } e lê o utilizador de /auth/me', async () => {
    const pedidos = backend()
    const eu = await entrar({ email: 'chefe@escola.ao', palavraPasse: 'segredo' })

    expect(pedidos[0]).toEqual({
      caminho: 'login',
      corpo: { email: 'chefe@escola.ao', password: 'segredo' },
    })
    expect(eu).toMatchObject({ id: 'u-chefe', nome: 'Domingas Chefe', primeiroNome: 'Domingas' })
    expect(eu.permissoes).toEqual(
      expect.arrayContaining(['estudantes:ler', 'matriculas:escrever', 'anos:gerir']),
    )
    expect(eu.permissoes).not.toContain('estudantes:escrever')
    expect(sessao.papel()).toBe('CHEFE_SECRETARIA')
    await expect(meAgora()).resolves.toEqual(eu)
  })

  it('permissões que o frontend não conhece: vale a tabela do papel', async () => {
    backend(me({ role: 'SECRETARIO', permissions: ['coisa-nova:read'] }))
    const eu = await entrar({ email: 's@escola.ao', palavraPasse: 'x' })
    expect(eu.permissoes).toContain('matriculas:escrever')
    expect(eu.permissoes).not.toContain('turmas:escrever')
  })

  it('credenciais erradas: 401 com código próprio e sem guardar token', async () => {
    server.use(http.post('/sis/auth/login', () => erroNest(401, 'Invalid credentials')))
    const erro = (await entrar({ email: 'a@b.ao', palavraPasse: 'x' }).catch(
      (e: unknown) => e,
    )) as ApiError
    expect(erro.status).toBe(401)
    expect(erro.temCodigo('CREDENCIAIS_INVALIDAS')).toBe(true)
    expect(sessao.tokenAcesso()).toBeNull()
  })

  it('ao abrir a aplicação recupera a sessão pelo cookie de renovação', async () => {
    server.use(
      http.post('/sis/auth/refresh', () =>
        HttpResponse.json({ accessToken: token(2), tokenType: 'Bearer', expiresIn: 3600 }),
      ),
    )
    await expect(garantirSessao()).resolves.toBe(true)
    expect(sessao.tokenAcesso()).toBe(token(2))
  })

  it('sem cookie válido, não há sessão', async () => {
    server.use(http.post('/sis/auth/refresh', () => erroNest(401, 'Invalid refresh token')))
    await expect(garantirSessao()).resolves.toBe(false)
  })

  it('401 a meio do trabalho: renova uma vez e repete o pedido', async () => {
    sessao.definirToken('vencido')
    const vistos: (string | null)[] = []
    server.use(
      http.post('/sis/auth/refresh', () =>
        HttpResponse.json({ accessToken: 'novo', tokenType: 'Bearer', expiresIn: 3600 }),
      ),
      http.get('/sis/academic-years', ({ request }) => {
        const autorizacao = request.headers.get('Authorization')
        vistos.push(autorizacao)
        return autorizacao === 'Bearer novo'
          ? HttpResponse.json([])
          : erroNest(401, 'A bearer access token is required.')
      }),
    )
    const { data } = await apiSis.GET('/academic-years')
    expect(data).toEqual([])
    expect(vistos).toEqual(['Bearer vencido', 'Bearer novo'])
  })

  it('401 e a renovação também falha: a sessão termina como expirada', async () => {
    sessao.definirToken('vencido')
    const fim = vi.fn()
    const desligar = sessao.aoTerminar(fim)
    server.use(
      http.post('/sis/auth/refresh', () => erroNest(401, 'Invalid refresh token')),
      http.get('/sis/academic-years', () => erroNest(401, 'Unauthorized')),
    )
    await apiSis.GET('/academic-years').catch(() => undefined)
    expect(fim).toHaveBeenCalledWith('expirada')
    desligar()
  })

  it('sair anula o cookie no servidor e esquece token e papel', async () => {
    const pedidos = backend()
    sessao.definirToken(token())
    sessao.definirPapel('SECRETARIO')
    await sair()
    expect(pedidos.map((p) => p.caminho)).toEqual(['logout'])
    expect(sessao.tokenAcesso()).toBeNull()
    expect(sessao.papel()).toBeNull()
  })
})
