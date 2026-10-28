import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/node'
import { ApiError, sessao } from '@/shared/api'
import { jwtDeTeste } from '@/test/jwt'
import { entrar, garantirSessao, meQuery, sair } from './queries'

// Área "sessao" ligada ao backend SIS real; as outras ficam no MSW (modo híbrido)
vi.mock('@/shared/config/ligacao', async (original) => ({
  ...(await original<typeof import('@/shared/config/ligacao')>()),
  eReal: (area: string) => area === 'sessao',
}))

const daquiAUmaHora = () => Math.floor(Date.now() / 1000) + 3600

function backendComLogin(claims: object) {
  const pedidos: unknown[] = []
  server.use(
    http.post('/sis/auth/login', async ({ request }) => {
      pedidos.push(await request.json())
      return HttpResponse.json({
        accessToken: jwtDeTeste(claims),
        tokenType: 'Bearer',
        expiresIn: 3600,
      })
    }),
  )
  return pedidos
}

const meAgora = () =>
  (meQuery().queryFn as (c: { signal: AbortSignal }) => unknown)({
    signal: new AbortController().signal,
  })

// O setup dos testes abre uma sessão simulada (tk-u1); aqui começa-se sem nenhuma
beforeEach(() => sessao.definirToken(null))

describe('sessão no backend SIS', () => {
  it('entra com { email, password } e lê o utilizador e o papel do token', async () => {
    const pedidos = backendComLogin({
      sub: 'b1c2',
      email: 'chefe@escola.ao',
      role: 'CHEFE_SECRETARIA',
      exp: daquiAUmaHora(),
    })
    const eu = await entrar({ email: 'chefe@escola.ao', palavraPasse: 'segredo' })

    expect(pedidos).toEqual([{ email: 'chefe@escola.ao', password: 'segredo' }])
    expect(eu).toMatchObject({ id: 'b1c2', email: 'chefe@escola.ao', primeiroNome: 'chefe' })
    expect(eu.permissoes).toContain('anos:gerir')
    await expect(meAgora()).resolves.toEqual(eu)
  })

  it('o secretário não ganha permissões de chefia', async () => {
    backendComLogin({ sub: 's1', email: 's@escola.ao', role: 'SECRETARIO', exp: daquiAUmaHora() })
    const eu = await entrar({ email: 's@escola.ao', palavraPasse: 'x' })
    expect(eu.permissoes).toContain('matriculas:escrever')
    expect(eu.permissoes).not.toContain('turmas:escrever')
  })

  it('credenciais erradas: 401 sem terminar sessão nem renovar', async () => {
    server.use(
      http.post('/sis/auth/login', () =>
        HttpResponse.json(
          { statusCode: 401, error: { message: 'Invalid credentials', statusCode: 401 } },
          { status: 401 },
        ),
      ),
    )
    const erro = (await entrar({ email: 'a@b.ao', palavraPasse: 'x' }).catch(
      (e: unknown) => e,
    )) as ApiError
    expect(erro.status).toBe(401)
    expect(sessao.tokenAcesso()).toBeNull()
  })

  it('sem renovação: sem token em memória não há sessão', async () => {
    await expect(garantirSessao()).resolves.toBe(false)
    await expect(meAgora()).rejects.toBeInstanceOf(ApiError)
  })

  it('token expirado não conta como sessão', async () => {
    sessao.definirToken(jwtDeTeste({ sub: 'x', exp: Math.floor(Date.now() / 1000) - 10 }))
    await expect(meAgora()).rejects.toMatchObject({ status: 401 })
  })

  it('sair esquece o token sem chamar o servidor', async () => {
    sessao.definirToken(jwtDeTeste({ sub: 'x', exp: daquiAUmaHora() }))
    await sair()
    expect(sessao.tokenAcesso()).toBeNull()
  })
})
