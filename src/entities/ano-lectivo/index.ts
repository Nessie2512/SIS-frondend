// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { AnoLectivo, EstadoAnoLectivo } from './model/tipos'
export { paraAnoLectivo, TOM_ESTADO_ANO } from './model/mapeadores'
export { useContextoAno } from './model/contexto'
export {
  aberturaQuery,
  anoLectivoKeys,
  anosLectivosQuery,
  encerramentoQuery,
  type Abertura,
  type Encerramento,
} from './api/queries'
export { SelectorAno } from './ui/selector-ano'
