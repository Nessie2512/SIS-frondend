import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type { DtoSis } from '@/shared/api/sis'
import type { EstadoMatricula, Matricula, PaginaMatriculas } from './tipos'

const ESTADO = {
  PENDENTE: { rotulo: msg`A confirmar`, tom: 'accao' },
  CONFIRMADA: { rotulo: msg`Confirmada`, tom: 'sucesso' },
  ANULADA: { rotulo: msg`Anulada`, tom: 'perigo' },
  CONCLUIDA: { rotulo: msg`Concluída`, tom: 'neutra' },
} as const satisfies Record<EstadoMatricula, unknown>

export function paraMatricula(dto: Dto<'MatriculaDto'>): Matricula {
  const estado = ESTADO[dto.estado]
  return {
    id: dto.id,
    estudanteId: dto.estudanteId,
    estudanteNome: dto.estudanteNome,
    numeroProcesso: dto.numeroProcesso,
    classeId: dto.classeId,
    classe: dto.classeDesignacao,
    turmaId: dto.turmaId,
    turma: dto.turmaDesignacao,
    estado: dto.estado,
    estadoRotulo: i18n._(estado.rotulo),
    estadoTom: estado.tom,
    documentosEmFalta: dto.documentosEmFalta,
    criadaEm: dto.criadaEm,
  }
}

export function paraPaginaMatriculas(dto: Dto<'PaginaMatriculaDto'>): PaginaMatriculas {
  return {
    matriculas: dto.items.map(paraMatricula),
    total: dto.total,
    page: dto.page,
    totalPaginas: Math.max(1, Math.ceil(dto.total / dto.pageSize)),
  }
}

/**
 * Backend SIS: lifecycleStatus da matrícula → estados do ecrã. Matrícula directa já é
 * confirmada (ACTIVE); CLOSED é anulada; COMPLETED, concluída no fecho do ano. As confirmações
 * pendentes de pagamento são as matrículas «a confirmar».
 */
export const ESTADO_DO_SIS = {
  ACTIVE: 'CONFIRMADA',
  CLOSED: 'ANULADA',
  COMPLETED: 'CONCLUIDA',
} as const satisfies Record<DtoSis<'EnrollmentListItemDto'>['status'], EstadoMatricula>

export function paraMatriculaDoSis(
  dto: DtoSis<'EnrollmentListItemDto'> | DtoSis<'ConfirmationListItemDto'>,
): Matricula {
  const confirmacao = 'confirmationDate' in dto
  const codigo: EstadoMatricula = confirmacao
    ? dto.status === 'REJECTED'
      ? 'ANULADA'
      : dto.status === 'CONFIRMED'
        ? 'CONFIRMADA'
        : 'PENDENTE'
    : ESTADO_DO_SIS[dto.status]
  const estado = ESTADO[codigo]
  return {
    id: dto.uuid,
    estudanteId: dto.student.uuid,
    estudanteNome: dto.student.name,
    numeroProcesso: (dto.student.studentCode as string | null | undefined) ?? '',
    classeId: dto.grade.uuid,
    classe: dto.grade.name,
    turmaId: dto.class.uuid,
    turma: dto.class.name,
    estado: codigo,
    estadoRotulo: i18n._(estado.rotulo),
    estadoTom: estado.tom,
    // O backend não tem documentos dos estudantes: a coluna não aparece no modo SIS
    documentosEmFalta: 0,
    criadaEm: confirmacao ? dto.confirmationDate : dto.enrollmentDate,
  }
}
