import type { Dto } from '@/shared/api'

export type EstadoPlano = Dto<'EstadoPlano'>

export interface PlanoResumo {
  id: string
  classeId: string
  versao: number
  estado: EstadoPlano
  estadoRotulo: string
  estadoTom: 'neutra' | 'accao' | 'sucesso'
  /** Só o rascunho se edita; publicar é irreversível (guia 2.2) */
  editavel: boolean
  publicadoEm: string | null
  totalHoras: number
}

export interface LinhaPlano {
  disciplinaId: string
  disciplina: string
  sigla: string
  horasSemanais: number
}

export interface Plano extends PlanoResumo {
  linhas: LinhaPlano[]
  /** ETag para If-Match */
  revisao: string
}
