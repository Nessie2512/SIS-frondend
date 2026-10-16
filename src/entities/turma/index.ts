// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { Turma, Turno, EstadoTurma, FiltrosTurma, PaginaTurmas, Inscrito } from './model/tipos'
export { paraTurma, paraPaginaTurmas, paraInscrito } from './model/mapeadores'
export { turmaKeys, turmasQuery, turmaQuery, inscritosQuery } from './api/queries'
export { BarraOcupacao } from './ui/barra-ocupacao'
