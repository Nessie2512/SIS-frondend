/** Modelo de vista da turma: é isto que os componentes recebem, nunca o DTO (guia 4.3). */
export type Turno = 'MANHA' | 'TARDE' | 'NOITE'
export type EstadoTurma = 'ACTIVA' | 'ENCERRADA'

export interface Turma {
  id: string
  designacao: string
  classeId: string
  classe: string
  turno: Turno
  turnoRotulo: string
  sala: string | null
  lotacaoMaxima: number
  inscritos: number
  vagas: number
  /** 0–1, para a barra de ocupação */
  ocupacao: number
  turmaCheia: boolean
  encerrada: boolean
}

export interface FiltrosTurma {
  anoLectivoId: string
  classeId?: string
  turno?: Turno
  estado: EstadoTurma
  page: number
}

export interface PaginaTurmas {
  turmas: Turma[]
  total: number
  page: number
  totalPaginas: number
}
