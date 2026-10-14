export type EstadoAnoLectivo = 'PLANEADO' | 'EM_CURSO' | 'ENCERRADO'

export interface AnoLectivo {
  id: string
  designacao: string
  dataInicio: string
  dataFim: string
  estado: EstadoAnoLectivo
  estadoRotulo: string
  /** Ano encerrado é só de leitura (guia 2.4) */
  soLeitura: boolean
}
