export type EstadoEstudante = 'ACTIVO' | 'TRANSFERIDO' | 'DESISTENTE' | 'CONCLUIDO' | 'ANULADO'
export type TomEstado = 'neutra' | 'accao' | 'sucesso' | 'aviso' | 'perigo'

/** Linha da lista de estudantes (guia 7.1: só o que decide a acção seguinte). */
export interface EstudanteResumo {
  id: string
  numeroProcesso: string
  nome: string
  dataNascimento: string
  idade: number
  fotografiaUrl: string | null
  estado: EstadoEstudante
  estadoRotulo: string
  estadoTom: TomEstado
  /** Ex.: "7.ª classe · 7.ª A" ou "7.ª classe · sem turma" */
  matricula: string | null
  semTurma: boolean
  /** Matrícula no ano em contexto */
  matriculaId: string | null
  turmaId: string | null
  matriculaPendente: boolean
  documentosEmFalta: number
}

export interface Estudante extends EstudanteResumo {
  sexo: 'M' | 'F'
  documentoIdentificacao: string | null
  telefone: string | null
  morada: string | null
  naturalidade: string | null
}

export type TipoEventoPercurso =
  'MATRICULA' | 'INSCRICAO' | 'MUDANCA_TURMA' | 'TRANSFERENCIA' | 'RESULTADO' | 'RECTIFICACAO'

export interface EventoPercurso {
  id: string
  data: string
  anoLectivo: string
  tipo: TipoEventoPercurso
  tipoRotulo: string
  descricao: string
  autor: string
  rectificaId: string | null
  motivo: string | null
}

export type EstadoDocumento = 'ENTREGUE' | 'EM_FALTA' | 'DISPENSADO'

export interface DocumentoEstudante {
  id: string
  designacao: string
  obrigatorio: boolean
  estado: EstadoDocumento
  entregue: boolean
}

export interface Encarregado {
  id: string
  nome: string
  parentesco: string
  telefone: string
  email: string | null
  principal: boolean
  outrosEducandos: number
}

export interface FiltrosEstudantes {
  anoLectivoId: string
  pesquisa?: string
  classeId?: string
  estado?: EstadoEstudante
  page: number
}

export interface PaginaEstudantes {
  estudantes: EstudanteResumo[]
  total: number
  page: number
  totalPaginas: number
}

export type TipoOcorrencia = 'DISCIPLINAR' | 'SAUDE' | 'PEDAGOGICA' | 'OUTRA'

export interface Ocorrencia {
  id: string
  data: string
  tipo: TipoOcorrencia
  tipoRotulo: string
  descricao: string
  autor: string
  registadaEm: string
}
