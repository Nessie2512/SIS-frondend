import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
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
