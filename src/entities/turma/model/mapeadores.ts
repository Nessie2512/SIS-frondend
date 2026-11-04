import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type { ClasseSis, TurmaSis } from '@/shared/api/sis'
import type { Inscrito, PaginaTurmas, Turma, Turno } from './tipos'

const ROTULO_TURNO = {
  MANHA: msg`Manhã`,
  TARDE: msg`Tarde`,
  NOITE: msg`Noite`,
  INTEGRAL: msg`Integral`,
} satisfies Record<Turno, unknown>

const TURNO_DO_SIS = {
  MORNING: 'MANHA',
  AFTERNOON: 'TARDE',
  NIGHT: 'NOITE',
  INTEGRAL: 'INTEGRAL',
} satisfies Record<TurmaSis['period'], Turno>

/**
 * Backend SIS: a turma refere a classe pelo id numérico e traz a lotação (capacity, 40 por
 * omissão). Os inscritos contam-se à parte (relatório da turma); sem essa contagem, a ocupação
 * mostra-se como "por publicar" (lotação 0). A sala vem em room e o director de turma em
 * director, ambos em texto (PATCH /classes/:uuid, dev 04/11). O director é guardado pelo nome:
 * o nome faz também de identificador na escolha (professorId).
 * Turma inactiva = encerrada.
 */
export function paraTurmaDoSis(
  dto: TurmaSis,
  classe: ClasseSis | undefined,
  inscritos?: number,
): Turma {
  const director = dto.director?.trim() || null
  const turno = TURNO_DO_SIS[dto.period]
  const lotacao = inscritos === undefined ? 0 : dto.capacity
  const vagas = Math.max(0, lotacao - (inscritos ?? 0))
  return {
    id: dto.uuid,
    designacao: dto.name,
    classeId: classe?.uuid ?? '',
    classe: classe?.name ?? '',
    turno,
    turnoRotulo: i18n._(ROTULO_TURNO[turno]),
    sala: dto.room?.trim() || null,
    lotacaoMaxima: lotacao,
    inscritos: inscritos ?? 0,
    vagas,
    ocupacao: lotacao ? Math.min(1, (inscritos ?? 0) / lotacao) : 0,
    turmaCheia: lotacao > 0 && vagas === 0,
    encerrada: !dto.isActive,
    directorTurma: director ? { professorId: director, nome: director } : null,
  }
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
    turnoRotulo: i18n._(ROTULO_TURNO[dto.turno]),
    sala: dto.sala,
    lotacaoMaxima: dto.lotacaoMaxima,
    inscritos: dto.inscritos,
    vagas,
    ocupacao: dto.lotacaoMaxima > 0 ? Math.min(1, dto.inscritos / dto.lotacaoMaxima) : 0,
    turmaCheia: vagas === 0,
    encerrada: dto.estado === 'ENCERRADA',
    directorTurma: dto.directorTurma,
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

export function paraInscrito(dto: Dto<'InscritoDto'>): Inscrito {
  return {
    matriculaId: dto.matriculaId,
    estudanteId: dto.estudanteId,
    turmaId: dto.turmaId,
    nome: dto.nome,
    numeroProcesso: dto.numeroProcesso,
    fotografiaUrl: dto.fotografiaUrl,
  }
}
