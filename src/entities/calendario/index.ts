// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { Calendario, Evento, TipoEvento, Trimestre } from './model/tipos'
export { paraEvento, rotuloTipoEvento, TIPOS_EVENTO } from './model/mapeadores'
export {
  dataPorExtenso,
  eventosDe,
  hojeCivil,
  intervaloCurto,
  nomeDoMes,
  trimestreDe,
} from './model/datas'
export { calendarioKeys, calendarioQuery } from './api/queries'
export { GrelhaAno, LegendaCalendario } from './ui/grelha-ano'
