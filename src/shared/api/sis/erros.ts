import type { ErroDeCampo } from '../api-error'

/**
 * Erros do backend SIS (NestJS) → forma de problema que o ApiError entende (guia 2.6).
 *
 * Três formas observadas:
 * - problem+json (RFC 9457, desde 30/10): { type, title, status, detail, code, errors?, requestId }
 * - a anterior: { statusCode, timestamp, path, error: { message: string | string[], error } }
 * - a padrão do Nest: { statusCode, message, error }
 * As mensagens de validação vêm do class-validator, em inglês: "email must be an email".
 */
export interface ProblemaSis {
  title: string
  detail?: string
  errors: ErroDeCampo[]
  code?: string
  requestId?: string
}

type CorpoProblema = {
  type?: unknown
  title?: unknown
  detail?: unknown
  code?: unknown
  requestId?: unknown
  errors?: unknown
}

/** Códigos do backend SIS → códigos de domínio que a interface já sabe explicar. */
const CODIGOS_SIS: Record<string, string> = {
  CLASS_CAPACITY_EXCEEDED: 'LOTACAO_ESGOTADA',
  ENROLLMENT_REQUIRES_ACTIVE_ACADEMIC_YEAR: 'ANO_NAO_ACTIVO',
  ENROLLMENT_REQUIRES_ACTIVE_CLASS: 'TURMA_INACTIVA',
  CLASS_ACADEMIC_YEAR_MISMATCH: 'TURMA_DE_OUTRO_ANO',
  CLASS_MODIFIED: 'VERSAO_DESACTUALIZADA',
  CLASS_CAPACITY_BELOW_ENROLLED: 'LOTACAO_ABAIXO_DOS_INSCRITOS',
  CLASS_DIRECTOR_NOT_ASSIGNED: 'DIRECTOR_NAO_LECCIONA',
  CLASS_NAME_ALREADY_EXISTS: 'TURMA_DUPLICADA',
  ACADEMIC_YEAR_CLOSED: 'ANO_ENCERRADO',
}

/** Códigos genéricos do backend que a interface já trata pelo estado HTTP. */
const CODIGOS_GENERICOS = new Set(['FORBIDDEN', 'UNAUTHORIZED', 'BAD_REQUEST', 'NOT_FOUND'])

function doProblemJson(status: number, corpo: CorpoProblema): ProblemaSis {
  const texto = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
  const codigo = texto(corpo.code)
  const errors = Array.isArray(corpo.errors)
    ? corpo.errors.flatMap((e): ErroDeCampo[] => {
        if (typeof e === 'string') return [paraErroDeCampo(e)]
        if (!e || typeof e !== 'object') return []
        const { field, campo, message, mensagem } = e as Record<string, unknown>
        const m = texto(message) ?? texto(mensagem) ?? ''
        return [{ campo: texto(field) ?? texto(campo) ?? paraErroDeCampo(m).campo, mensagem: m }]
      })
    : []
  // A atribuição de turma recusa disciplinas fora das especialidades só com o texto (422)
  const naoHabilitado = /not qualified to teach/i.test(texto(corpo.detail) ?? '')
  return {
    title: texto(corpo.title) ?? `Pedido falhou (${status})`,
    detail: texto(corpo.detail),
    errors,
    code: naoHabilitado
      ? 'DOCENTE_NAO_HABILITADO'
      : ((codigo && CODIGOS_SIS[codigo]) ??
        // Servidores anteriores ao 03/11 mandavam code CONFLICT e o código só em detail
        CODIGOS_SIS[texto(corpo.detail) ?? ''] ??
        (codigo && !CODIGOS_GENERICOS.has(codigo) ? codigo : codigoDoEstado(status))),
    requestId: texto(corpo.requestId),
  }
}

type CorpoNest = {
  message?: unknown
  error?: unknown
  statusCode?: unknown
}

export function problemaDoSis(status: number, corpo: unknown): ProblemaSis {
  if (corpo && typeof corpo === 'object' && 'title' in corpo && 'status' in corpo) {
    return doProblemJson(status, corpo as CorpoProblema)
  }
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
  if (status === 503) return 'FINANCEIRO_INDISPONIVEL'
  return undefined
}
