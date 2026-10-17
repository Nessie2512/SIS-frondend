export type EstadoMatricula = 'PENDENTE' | 'CONFIRMADA' | 'ANULADA' | 'CONCLUIDA'

export interface Matricula {
  id: string
  estudanteId: string
  estudanteNome: string
  numeroProcesso: string
  classeId: string
  classe: string
  turmaId: string | null
  turma: string | null
  estado: EstadoMatricula
  estadoRotulo: string
  estadoTom: 'neutra' | 'accao' | 'sucesso' | 'perigo'
  documentosEmFalta: number
  criadaEm: string
}

export interface FiltrosMatriculas {
  anoLectivoId: string
  classeId?: string
  estado?: EstadoMatricula
  semTurma?: boolean
  /** Campo da API, com «-» para descendente */
  ordenar?: string
  page: number
}

export interface PaginaMatriculas {
  matriculas: Matricula[]
  total: number
  page: number
  totalPaginas: number
}
