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
 * Backend SIS: o ano só tem startYear. As datas seguem a convenção da designação "2026/2027"
 * (1 de Setembro a 31 de Julho) até o backend as publicar; servem de limites aos selectores.
 */
export function paraAnoLectivoDoSis(dto: AnoSis): AnoLectivo {
  const estado: EstadoAnoLectivo = dto.isClosed
    ? 'ENCERRADO'
    : dto.isActive
      ? 'EM_CURSO'
      : 'PLANEADO'
  return {
    id: dto.uuid,
    designacao: dto.label,
    dataInicio: `${dto.startYear}-09-01`,
    dataFim: `${dto.startYear + 1}-07-31`,
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
