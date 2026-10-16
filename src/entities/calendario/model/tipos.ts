import type { Dto } from '@/shared/api'

export type TipoEvento = Dto<'TipoEvento'>

export interface Trimestre {
  numero: number
  /** Ex.: «1.º trimestre» */
  rotulo: string
  inicio: string
  fim: string
}

export interface Evento {
  id: string
  titulo: string
  tipo: TipoEvento
  tipoRotulo: string
  inicio: string
  fim: string
  /** Feriados nacionais: não se apagam */
  fixo: boolean
}

export interface Calendario {
  anoLectivoId: string
  trimestres: Trimestre[]
  eventos: Evento[]
}
