import type { Dto } from '@/shared/api'

export type EstadoDisciplina = Dto<'EstadoDisciplina'>

export interface Disciplina {
  id: string
  nome: string
  sigla: string
  estado: EstadoDisciplina
  activa: boolean
  /** Usada num plano ou numa habilitação: não se elimina, só se inactiva (guia 2.4) */
  emUso: boolean
}
