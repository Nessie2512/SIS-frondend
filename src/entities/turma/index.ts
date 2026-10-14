// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { Turma, Turno, EstadoTurma, FiltrosTurma, PaginaTurmas } from './model/tipos'
export { paraTurma, paraPaginaTurmas } from './model/mapeadores'
export { turmaKeys, turmasQuery, turmaQuery } from './api/queries'
export { BarraOcupacao } from './ui/barra-ocupacao'
