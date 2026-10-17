import type { components } from '@/shared/api'

type S = components['schemas']

export type EstadoUtilizador = S['EstadoUtilizador']
export type AccaoAuditoria = S['AccaoAuditoria']
export type Perfil = S['PerfilDto']

export type Conta = S['UtilizadorDto'] & {
  estadoRotulo: string
  estadoTom: 'sucesso' | 'neutra'
}

export type EntradaAuditoria = S['EntradaAuditoriaDto'] & { accaoRotulo: string }

export interface PaginaAuditoria {
  entradas: EntradaAuditoria[]
  total: number
  page: number
  totalPaginas: number
}

export interface FiltrosContas {
  pesquisa?: string
  perfilId?: string
  estado?: EstadoUtilizador
}

export interface FiltrosAuditoria {
  pesquisa?: string
  accao?: AccaoAuditoria
  page: number
}
