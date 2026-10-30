// shared/api/client.ts — um único cliente gerado, com middleware (guia 4.5)
import createClient, { type Middleware } from 'openapi-fetch'
import { eSoApiReal } from '@/shared/config/ligacao'
import { ApiError } from './api-error'
import type { paths } from './schema'
import { eventosApi, sessao } from './sessao'

/** Absoluto para funcionar também nos testes (jsdom); em produção é a mesma origem. */
export const BASE_URL = new URL('/api/v1', window.location.origin).href

/** ETag por URL de recurso, para If-Match em PATCH e acções (controlo de concorrência). */
const etags = new Map<string, string>()

const METODOS_DE_ESCRITA = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const comContexto: Middleware = {
  async onRequest({ request }) {
    // Staging só com a API real: o contrato provisório não tem servidor (iria dar o index.html)
    if (eSoApiReal()) {
      throw new ApiError(501, {
        title: 'NAO_DISPONIVEL',
        code: 'NAO_DISPONIVEL',
        detail: `${request.method} ${new URL(request.url).pathname}`,
      })
    }
    request.headers.set('X-Request-Id', crypto.randomUUID())
    const token = sessao.tokenAcesso()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)

    if (METODOS_DE_ESCRITA.has(request.method) && !request.headers.has('If-Match')) {
      const etag = etags.get(chaveDoRecurso(request.url))
      if (etag) request.headers.set('If-Match', etag)
    }
    return request
  },

  async onResponse({ request, response }) {
    const etag = response.headers.get('ETag')
    if (etag) etags.set(chaveDoRecurso(request.url), etag)

    if (response.ok) return response

    if (response.status === 403) eventosApi.emitirPermissaoNegada()

    // A entrada e a renovação tratam o seu próprio 401
    const pedidoDeSessao = new URL(request.url).pathname.startsWith('/api/v1/auth/')
    if (response.status === 401 && !pedidoDeSessao && !request.headers.has('X-Repeticao')) {
      const renovado = await sessao.renovarUmaVez()
      if (renovado) {
        const repeticao = new Request(request, { headers: new Headers(request.headers) })
        repeticao.headers.set('X-Repeticao', '1')
        repeticao.headers.set('Authorization', `Bearer ${sessao.tokenAcesso()}`)
        return fetch(repeticao).then((r) => (r.ok ? r : lancarApiError(r)))
      }
      sessao.terminar('expirada')
    }
    return lancarApiError(response)
  },

  onError({ error }) {
    if (error instanceof ApiError) return error
    // Falha de rede: status 0, tratada como transitória
    return new ApiError(0, { title: 'Sem ligação', detail: String(error) })
  },
}

async function lancarApiError(response: Response): Promise<never> {
  const problema = await response
    .clone()
    .json()
    .catch(() => null)
  throw new ApiError(response.status, problema)
}

function chaveDoRecurso(url: string) {
  return new URL(url, window.location.origin).pathname
}

/** Gera uma Idempotency-Key; reutilizar a mesma em repetições do mesmo gesto. */
export function novaChaveIdempotencia() {
  return crypto.randomUUID()
}

export const api = createClient<paths>({
  baseUrl: BASE_URL,
  // Resolve o fetch em cada pedido (e não no arranque) para o MSW o poder interceptar nos testes
  fetch: (pedido) => globalThis.fetch(pedido),
})
api.use(comContexto)
