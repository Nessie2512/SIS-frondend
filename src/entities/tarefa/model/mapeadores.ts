import type { Dto } from '@/shared/api'
import type { Tarefa } from './tipos'

export function paraTarefa(dto: Dto<'TarefaDto'>): Tarefa {
  return { ...dto, erros: [...dto.erros], terminada: dto.estado !== 'EM_CURSO' }
}
