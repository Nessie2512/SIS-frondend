import type { Dto } from '@/shared/api'

export type EstadoDisciplina = Dto<'EstadoDisciplina'>

export interface Disciplina {
  id: string
  nome: string
  sigla: string
  estado: EstadoDisciplina
  activa: boolean
  /** Num plano vigente: não se elimina, só se inactiva (guia 2.4) */
  emUso: boolean
}
