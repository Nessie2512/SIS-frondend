import type { Dto } from '@/shared/api'

export type EstadoProfessor = Dto<'EstadoProfessor'>
export type TomEstado = 'neutra' | 'accao' | 'sucesso' | 'aviso' | 'perigo'

export interface ProfessorResumo {
  id: string
  numeroAgente: string
  nome: string
  estado: EstadoProfessor
  estadoRotulo: string
  estadoTom: TomEstado
  /** Só ACTIVO pode receber novas atribuições (guia 2.2) */
  disponivel: boolean
  disciplinas: { id: string; nome: string; sigla: string }[]
  /** Ex.: «Matemática, Física» */
  disciplinasTexto: string
  cargaLectiva: number
  cargaMaxima: number
  /** 0–1 */
  ocupacao: number
  telefone: string | null
  email: string | null
  fotografiaUrl: string | null
}

export interface Atribuicao {
  id: string
  turmaId: string
  turma: string
  classe: string
  disciplinaId: string
  disciplina: string
  horasSemanais: number
  desde: string
}

export interface DocumentoProfessor {
  tipo: string
  rotulo: string
  entregue: boolean
}

export interface Professor extends ProfessorResumo {
  habilitacao: string
  dataAdmissao: string
  atribuicoes: Atribuicao[]
  documentos: DocumentoProfessor[]
  documentosEmFalta: number
}

export interface FiltrosProfessores {
  anoLectivoId: string
  pesquisa?: string
  estado?: EstadoProfessor
  disciplinaId?: string
  ordenar?: string
  page?: number
}

export interface PaginaProfessores {
  professores: ProfessorResumo[]
  total: number
  page: number
  totalPaginas: number
}
