import type { Dto } from '@/shared/api'

export type EcraVista = Dto<'EcraVista'>
export type FiltrosVista = Dto<'FiltrosVistaDto'>

/** Uma combinação de filtros com nome, guardada pelo utilizador (guia 7.1). */
export interface Vista {
  id: string
  ecra: EcraVista
  nome: string
  filtros: FiltrosVista
}
