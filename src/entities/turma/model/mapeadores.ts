import type { Dto } from '@/shared/api'
import type { PaginaTurmas, Turma, Turno } from './tipos'

const ROTULO_TURNO: Record<Turno, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
}

/** DTO → modelo de vista. Único sítio que conhece a forma da API (guia 4.3). */
export function paraTurma(dto: Dto<'TurmaDto'>): Turma {
  const vagas = Math.max(0, dto.lotacaoMaxima - dto.inscritos)
  return {
    id: dto.id,
    designacao: dto.designacao,
    classeId: dto.classeId,
    classe: dto.classeDesignacao,
    turno: dto.turno,
    turnoRotulo: ROTULO_TURNO[dto.turno],
    sala: dto.sala,
    lotacaoMaxima: dto.lotacaoMaxima,
    inscritos: dto.inscritos,
    vagas,
    ocupacao: dto.lotacaoMaxima > 0 ? Math.min(1, dto.inscritos / dto.lotacaoMaxima) : 0,
    turmaCheia: vagas === 0,
    encerrada: dto.estado === 'ENCERRADA',
  }
}

export function paraPaginaTurmas(dto: Dto<'PaginaTurmaDto'>): PaginaTurmas {
  return {
    turmas: dto.items.map(paraTurma),
    total: dto.total,
    page: dto.page,
    totalPaginas: Math.max(1, Math.ceil(dto.total / dto.pageSize)),
  }
}
