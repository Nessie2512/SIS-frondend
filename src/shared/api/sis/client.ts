// shared/api/sis/client.ts — cliente do backend SIS real, tipado a partir do openapi.json (guia 4.3, 4.5)
import createClient, { type Middleware } from 'openapi-fetch'
import { SIS_URL } from '@/shared/config/ligacao'
import { ApiError } from '../api-error'
import { eventosApi, sessao } from '../sessao'
import { problemaDoSis } from './erros'
import type { components, paths } from './schema'

/** Caminhos que tratam o seu próprio 401 (credenciais erradas não são sessão expirada). */
const CAMINHOS_DE_SESSAO = ['/auth/login', '/auth/refresh', '/auth/logout']

function caminhoRelativo(url: string) {
  const caminho = new URL(url, window.location.origin).pathname
  const base = new URL(SIS_URL).pathname.replace(/\/$/, '')
  return caminho.startsWith(base) ? caminho.slice(base.length) || '/' : caminho
}

const comContexto: Middleware = {
  onRequest({ request }) {
    request.headers.set('X-Request-Id', crypto.randomUUID())
    const token = sessao.tokenAcesso()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },

  async onResponse({ request, response }) {
    if (response.ok) return desembrulhar(response)

    if (response.status === 403) eventosApi.emitirPermissaoNegada()

    // 401 a meio do trabalho: renova uma vez (cookie) e repete; se falhar, a sessão expirou
    const caminho = caminhoRelativo(request.url)
    const pedidoDeSessao = CAMINHOS_DE_SESSAO.includes(caminho)
    if (response.status === 401 && !pedidoDeSessao && !request.headers.has('X-Repeticao')) {
      if (await sessao.renovarUmaVez()) {
        const repeticao = new Request(request, { headers: new Headers(request.headers) })
        repeticao.headers.set('X-Repeticao', '1')
        repeticao.headers.set('Authorization', `Bearer ${sessao.tokenAcesso()}`)
        const segunda = await globalThis.fetch(repeticao)
        if (segunda.ok) return desembrulhar(segunda)
        return lancarErro(segunda, caminho)
      }
      if (sessao.tokenAcesso()) sessao.terminar('expirada')
    }
    return lancarErro(response, caminho)
  },

  onError({ error }) {
    if (error instanceof ApiError) return error
    return new ApiError(0, { title: 'Sem ligação', detail: String(error) })
  },
}

async function lancarErro(response: Response, caminho: string): Promise<never> {
  const corpo = await response
    .clone()
    .json()
    .catch(() => null)
  const problema = problemaDoSis(response.status, corpo)
  // Só a entrada tem credenciais; 401 na renovação ou na saída é só sessão inexistente
  if (response.status === 401 && caminho === '/auth/login') {
    problema.code = 'CREDENCIAIS_INVALIDAS'
  }
  throw new ApiError(response.status, problema)
}

/**
 * Até 28/10 as disciplinas respondiam { success, data }; o contrato de 30/10 já não o declara.
 * Fica a protecção: se voltar, entrega-se só `data`. As outras respostas passam intactas.
 */
async function desembrulhar(response: Response): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('json')) return response
  const corpo: unknown = await response
    .clone()
    .json()
    .catch(() => undefined)
  if (!eEnvelope(corpo)) return response
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(JSON.stringify(corpo.data), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function eEnvelope(corpo: unknown): corpo is { success: boolean; data: unknown } {
  return (
    !!corpo &&
    typeof corpo === 'object' &&
    !Array.isArray(corpo) &&
    typeof (corpo as { success?: unknown }).success === 'boolean' &&
    'data' in corpo
  )
}

export const apiSis = createClient<paths>({
  baseUrl: SIS_URL.replace(/\/$/, ''),
  // Resolve o fetch em cada pedido para o MSW o poder interceptar nos testes
  fetch: (pedido) => globalThis.fetch(pedido),
})
apiSis.use(comContexto)

/** Atalho para os DTOs do SIS: `DtoSis<'ClassOutputDto'>`. Só os mapeadores os devem usar. */
export type DtoSis<Nome extends keyof components['schemas']> = components['schemas'][Nome]
