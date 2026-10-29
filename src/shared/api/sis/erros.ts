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
}

type CorpoNest = {
  message?: unknown
  error?: unknown
  statusCode?: unknown
}

export function problemaDoSis(status: number, corpo: unknown): ProblemaSis {
  const raiz = (corpo && typeof corpo === 'object' ? corpo : {}) as CorpoNest
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
  }
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
