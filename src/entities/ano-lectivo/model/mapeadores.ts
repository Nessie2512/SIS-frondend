import type { Dto } from '@/shared/api'
import type { AnoLectivo, EstadoAnoLectivo } from './tipos'

const ROTULO: Record<EstadoAnoLectivo, string> = {
  PLANEADO: 'Planeado',
  EM_CURSO: 'Em curso',
  ENCERRADO: 'Encerrado',
}

export function paraAnoLectivo(dto: Dto<'AnoLectivoDto'>): AnoLectivo {
  return {
    id: dto.id,
    designacao: dto.designacao,
    dataInicio: dto.dataInicio,
    dataFim: dto.dataFim,
    estado: dto.estado,
    estadoRotulo: ROTULO[dto.estado],
    soLeitura: dto.estado === 'ENCERRADO',
  }
}
