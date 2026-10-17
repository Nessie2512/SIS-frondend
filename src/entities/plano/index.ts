// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { EstadoPlano, LinhaPlano, Plano, PlanoResumo } from './model/tipos'
export { comLinhas, paraPlano, paraPlanoResumo } from './model/mapeadores'
export { planoKeys, planoQuery, planosQuery } from './api/queries'
