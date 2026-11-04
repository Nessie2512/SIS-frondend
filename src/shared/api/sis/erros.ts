import type { ErroDeCampo } from '../api-error'

/**
 * Erros do backend SIS (NestJS) → forma de problema que o ApiError entende (guia 2.6).
 *
 * O backend responde assim (observado, não documentado no OpenAPI):
 *   { statusCode, timestamp, path, error: { message: string | string[], error, statusCode } }
 * e às vezes no formato padrão do Nest: { statusCode, message, error }.
 * As mensagens de validação vêm do class-validator, em inglês: "email must be an email".
 */
export interface ProblemaSis {
  title: string
  detail?: string
  errors: ErroDeCampo[]
  code?: string
  requestId?: string
}

type CorpoNest = {
  message?: unknown
  error?: unknown
  statusCode?: unknown
  type?: unknown
  title?: unknown
  status?: unknown
  detail?: unknown
  code?: unknown
  requestId?: unknown
  errors?: unknown
}

export function problemaDoSis(status: number, corpo: unknown, requestId?: string): ProblemaSis {
  const raiz = (corpo && typeof corpo === 'object' ? corpo : {}) as CorpoNest
  if (typeof raiz.title === 'string' || typeof raiz.detail === 'string') {
    return {
      title: typeof raiz.title === 'string' ? raiz.title : `Pedido falhou (${status})`,
      detail: typeof raiz.detail === 'string' ? raiz.detail : undefined,
      errors: paraErrosDeProblema(raiz.errors),
      code: typeof raiz.code === 'string' ? raiz.code : codigoDoEstado(status),
      requestId:
        typeof raiz.requestId === 'string' ? raiz.requestId : requestId,
    }
  }
  const interior = (raiz.error && typeof raiz.error === 'object' ? raiz.error : raiz) as CorpoNest
  const mensagens = paraLista(interior.message ?? raiz.message)
  const titulo =
    (typeof interior.error === 'string' && interior.error) ||
    (typeof raiz.error === 'string' && raiz.error) ||
    `Pedido falhou (${status})`

  // Várias mensagens = validação por campo; uma só = mensagem geral
  const errors =
    mensagens.length > 1 || status === 400 || status === 422 ? mensagens.map(paraErroDeCampo) : []

  return {
    title: titulo,
    detail: mensagens.length === 1 ? mensagens[0] : undefined,
    errors,
    code: codigoDoEstado(status),
    requestId,
  }
}

function paraErrosDeProblema(valor: unknown): ErroDeCampo[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((item): ErroDeCampo[] => {
    if (!item || typeof item !== 'object') return []
    const erro = item as { campo?: unknown; mensagem?: unknown; code?: unknown }
    if (typeof erro.mensagem !== 'string') return []
    return [
      {
        campo: typeof erro.campo === 'string' ? erro.campo : '',
        mensagem: erro.mensagem,
        code: typeof erro.code === 'string' ? erro.code : undefined,
      },
    ]
  })
}

function paraLista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((m): m is string => typeof m === 'string')
  return typeof valor === 'string' && valor ? [valor] : []
}

/** "email must be an email" → { campo: 'email' }; "address.city should not be empty" → 'address.city' */
export function paraErroDeCampo(mensagem: string): ErroDeCampo {
  const campo = /^([A-Za-z_][\w.[\]]*)\s/.exec(mensagem)?.[1] ?? ''
  return { campo, mensagem }
}

function codigoDoEstado(status: number) {
  if (status === 403) return 'PERMISSAO_NEGADA'
  return undefined
}
