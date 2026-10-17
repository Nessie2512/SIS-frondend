import type { components } from '@/shared/api'

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

/** Estudante inscrito numa turma (cartão do quadro, guia 6.3). */
export interface Inscrito {
  matriculaId: string
  estudanteId: string
  turmaId: string | null
  nome: string
  numeroProcesso: string
  fotografiaUrl: string | null
}

/** Disciplina do plano com o docente em vigor e o histórico de substituições (guia 2.3). */
export type DocenteTurma = components['schemas']['DocenteTurmaDto']

/** Resultado final de uma matrícula da turma (guia 2.3: registar antes de encerrar o ano). */
export type ResultadoFinal = components['schemas']['ResultadoFinalDto']
