import type { components } from './schema'

type Problema = components['schemas']['ProblemaDto']

/** Códigos de erro de domínio conhecidos (guia 2.6). */
export type CodigoErroDominio =
  | 'ANO_ENCERRADO'
  | 'LOTACAO_ESGOTADA'
  | 'MATRICULA_DUPLICADA'
  | 'ESTUDANTE_DUPLICADO'
  | 'DOCENTE_NAO_HABILITADO'
  | 'CLASSE_EM_USO'
  | 'VERSAO_DESACTUALIZADA'
  | 'PERMISSAO_NEGADA'
  | 'INSCRICAO_EXISTENTE'
  | 'DOCUMENTO_OBRIGATORIO'
  | 'CREDENCIAIS_INVALIDAS'

export interface ErroDeCampo {
  campo: string
  mensagem: string
  code?: string
}

/** Erro único de toda a camada HTTP: converte application/problem+json num objecto tipado. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly errors: ErroDeCampo[]
  readonly requestId: string | undefined
  /** Extensões do problema (ex.: matriculaId da matrícula existente) */
  readonly dados: Record<string, unknown>

  constructor(status: number, problema: Partial<Problema> | null) {
    super(problema?.detail ?? problema?.title ?? `Pedido falhou (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = problema?.code
    this.errors = problema?.errors ?? []
    this.requestId = problema?.requestId
    const {
      type: _t,
      title: _ti,
      status: _s,
      detail: _d,
      code: _c,
      requestId: _r,
      errors: _e,
      ...dados
    } = problema ?? {}
    this.dados = dados
  }

  temCodigo(code: CodigoErroDominio): boolean {
    return this.code === code
  }

  /** Falha de rede ou 5xx: o estado optimista deve ser revertido e oferecido Tentar de novo. */
  get eTransitorio(): boolean {
    return this.status === 0 || this.status >= 500 || this.status === 429
  }
}

export function eApiError(erro: unknown): erro is ApiError {
  return erro instanceof ApiError
}
