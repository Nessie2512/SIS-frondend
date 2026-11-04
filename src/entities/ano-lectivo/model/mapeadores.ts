import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type { AnoSis } from '@/shared/api/sis'
import type { AnoLectivo, EstadoAnoLectivo } from './tipos'

const ROTULO = {
  PLANEADO: msg`Planeado`,
  EM_CURSO: msg`Em curso`,
  ENCERRADO: msg`Encerrado`,
} satisfies Record<EstadoAnoLectivo, unknown>

export function paraAnoLectivo(dto: Dto<'AnoLectivoDto'>): AnoLectivo {
  return {
    id: dto.id,
    designacao: dto.designacao,
    dataInicio: dto.dataInicio,
    dataFim: dto.dataFim,
    estado: dto.estado,
    estadoRotulo: i18n._(ROTULO[dto.estado]),
    soLeitura: dto.estado === 'ENCERRADO',
  }
}

/**
 * Backend SIS: o código de 02/11 já devolve startDate e endDate, mas o openapi.json publicado
 * ainda não. Usam-se quando vêm; sem elas, as datas seguem a convenção da designação
 * "2026/2027" (1 de Setembro a 31 de Julho). Servem de limites aos selectores de data.
 */
export function paraAnoLectivoDoSis(
  dto: AnoSis & { startDate?: string; endDate?: string },
): AnoLectivo {
  const estado: EstadoAnoLectivo = dto.isClosed
    ? 'ENCERRADO'
    : dto.isActive
      ? 'EM_CURSO'
      : 'PLANEADO'
  return {
    id: dto.uuid,
    designacao: dto.label,
    dataInicio: dto.startDate?.slice(0, 10) || `${dto.startYear}-09-01`,
    dataFim: dto.endDate?.slice(0, 10) || `${dto.startYear + 1}-07-31`,
    estado,
    estadoRotulo: i18n._(ROTULO[estado]),
    soLeitura: estado === 'ENCERRADO',
  }
}

/** Tom da etiqueta de estado do ano (cabeçalho, lista e ficha do ano). */
export const TOM_ESTADO_ANO: Record<EstadoAnoLectivo, 'sucesso' | 'neutra' | 'aviso'> = {
  EM_CURSO: 'sucesso',
  PLANEADO: 'neutra',
  ENCERRADO: 'aviso',
}
