// shared/api/sis/client.ts — cliente do backend SIS real, tipado a partir do openapi.json (guia 4.3, 4.5)
import createClient, { type Middleware } from 'openapi-fetch'
import { SIS_URL } from '@/shared/config/ligacao'
import { ApiError } from '../api-error'
import { eventosApi, sessao } from '../sessao'
import { problemaDoSis } from './erros'
import type { components, paths } from './schema'

/** Caminhos que tratam o seu próprio 401 (credenciais erradas não são sessão expirada). */
const CAMINHOS_DE_SESSAO = ['/auth/login']

/** Cabeçalho local (não sai do cliente com significado): este pedido trata o seu próprio 403. */
export const SEM_AVISO_403 = 'X-Sem-Aviso-403'

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

    // O pedido do perfil trata o seu próprio 403 (avisar faria pedir o perfil outra vez, sem fim)
    if (response.status === 403 && !request.headers.has(SEM_AVISO_403)) {
      eventosApi.emitirPermissaoNegada()
    }

    // Sem renovação no backend: um 401 fora da entrada é sessão expirada (pede credenciais de novo)
    const pedidoDeSessao = CAMINHOS_DE_SESSAO.includes(caminhoRelativo(request.url))
    if (response.status === 401 && !pedidoDeSessao && sessao.tokenAcesso()) {
      sessao.terminar('expirada')
    }

    const corpo = await response
      .clone()
      .json()
      .catch(() => null)
    const problema = problemaDoSis(response.status, corpo)
    if (response.status === 401 && pedidoDeSessao) problema.code = 'CREDENCIAIS_INVALIDAS'
    throw new ApiError(response.status, problema)
  },

  onError({ error }) {
    if (error instanceof ApiError) return error
    return new ApiError(0, { title: 'Sem ligação', detail: String(error) })
  },
}

/**
 * Algumas rotas (níveis académicos, disciplinas) respondem { success, data }: entrega-se só
 * `data`, para os tipos e os mapeadores verem o recurso. As outras passam intactas.
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
