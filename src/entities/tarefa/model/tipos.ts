export type EstadoTarefa = 'EM_CURSO' | 'CONCLUIDA' | 'FALHADA'

/** Trabalho longo no servidor (listas, pautas, importações) acompanhado pelo cliente. */
export interface Tarefa {
  id: string
  titulo: string
  estado: EstadoTarefa
  progresso: number
  resultadoUrl: string | null
  erros: { linha: number; mensagem: string }[]
  terminada: boolean
}
