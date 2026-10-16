import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
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
