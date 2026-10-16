// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type {
  Atribuicao,
  DocumentoProfessor,
  EstadoProfessor,
  FiltrosProfessores,
  PaginaProfessores,
  Professor,
  ProfessorResumo,
} from './model/tipos'
export {
  comEstado,
  ESTADOS_PROFESSOR,
  paraProfessor,
  paraProfessorResumo,
  rotuloEstadoProfessor,
} from './model/mapeadores'
export { professorKeys, professoresQuery, professorQuery } from './api/queries'
export { CargaLectiva } from './ui/carga-lectiva'
