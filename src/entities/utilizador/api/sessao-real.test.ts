import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/mocks/node'
import { ApiError, eventosApi, sessao } from '@/shared/api'
import type { DtoSis } from '@/shared/api/sis'
import { jwtDeTeste } from '@/test/jwt'
import { entrar, garantirSessao, meQuery, sair } from './queries'

// Área "sessao" ligada ao backend SIS real; as outras ficam no MSW (modo híbrido)
vi.mock('@/shared/config/ligacao', async (original) => ({
  ...(await original<typeof import('@/shared/config/ligacao')>()),
  eReal: (area: string) => area === 'sessao',
}))

const daquiAUmaHora = () => Math.floor(Date.now() / 1000) + 3600

/** Forma observada do token do SIS (amostras de 28/10): só sub e exp. */
const tokenSis = (sub: string) => jwtDeTeste({ sub, exp: daquiAUmaHora() })

const perfil = (dados: Partial<DtoSis<'UserOutputDto'>>): DtoSis<'UserOutputDto'> => ({
  uuid: 'u-chefe',
  email: 'chefe@escola.ao',
  role: 'CHEFE_SECRETARIA',
  employeeNumber: 'BMA2026001',
  name: 'Domingas Chefe',
  sex: 'F',
  birthDate: '1985-01-01T00:00:00.000Z',
  address: 'Luanda',
  nationality: 'Angolana',
  isActive: true,
  ...dados,
})

function backend(sub: string, respostaPerfil: () => Response) {
  const pedidos: unknown[] = []
  server.use(
    http.post('/sis/auth/login', async ({ request }) => {
      pedidos.push(await request.json())
      return HttpResponse.json({ accessToken: tokenSis(sub), tokenType: 'Bearer', expiresIn: 3600 })
    }),
    http.get('/sis/users/:uuid', ({ params }) =>
      params.uuid === sub ? respostaPerfil() : HttpResponse.json({}, { status: 404 }),
    ),
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
  it('entra com { email, password } e lê nome e papel do perfil (GET /users/{sub})', async () => {
    const pedidos = backend('u-chefe', () => HttpResponse.json(perfil({})))
    const eu = await entrar({ email: 'chefe@escola.ao', palavraPasse: 'segredo' })

    expect(pedidos).toEqual([{ email: 'chefe@escola.ao', password: 'segredo' }])
    expect(eu).toMatchObject({ id: 'u-chefe', nome: 'Domingas Chefe', primeiroNome: 'Domingas' })
    expect(eu.permissoes).toContain('anos:gerir')
    expect(sessao.papel()).toBe('CHEFE_SECRETARIA')
    await expect(meAgora()).resolves.toEqual(eu)
  })

  it('o secretário não ganha permissões de chefia', async () => {
    backend('u-sec', () => HttpResponse.json(perfil({ uuid: 'u-sec', role: 'SECRETARIO' })))
    const eu = await entrar({ email: 's@escola.ao', palavraPasse: 'x' })
    expect(eu.permissoes).toContain('matriculas:escrever')
    expect(eu.permissoes).not.toContain('turmas:escrever')
  })

  it('sem acesso ao perfil (403): entra sem permissões e não pede o perfil sem fim', async () => {
    const aviso = vi.fn()
    const desligar = eventosApi.aoPermissaoNegada(aviso)
    backend('u-sec', () =>
      HttpResponse.json({ statusCode: 403, error: { message: 'Forbidden' } }, { status: 403 }),
    )
    const eu = await entrar({ email: ' S@Escola.ao ', palavraPasse: 'x' })
    expect(eu).toMatchObject({ id: 'u-sec', email: 's@escola.ao', permissoes: [] })
    expect(sessao.papel()).toBeNull()
    expect(aviso).not.toHaveBeenCalled()
    desligar()
  })

  it('credenciais erradas: 401 sem guardar token', async () => {
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

  it('sair esquece o token e o papel sem chamar o servidor', async () => {
    sessao.definirToken(tokenSis('x'))
    sessao.definirPapel('SECRETARIO')
    await sair()
    expect(sessao.tokenAcesso()).toBeNull()
    expect(sessao.papel()).toBeNull()
  })
})
