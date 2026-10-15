import { EtiquetaEstado } from '@/shared/ui'
import type { EstudanteResumo } from '../model/tipos'

export function EtiquetaEstadoEstudante({
  estudante,
}: {
  estudante: Pick<EstudanteResumo, 'estadoRotulo' | 'estadoTom'>
}) {
  return <EtiquetaEstado tom={estudante.estadoTom}>{estudante.estadoRotulo}</EtiquetaEstado>
}
