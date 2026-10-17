import type { Dto } from '@/shared/api'

export type TipoRelatorio = Dto<'TipoRelatorio'>
export type Relatorio = Dto<'RelatorioDto'>

export interface Exportacao {
  id: string
  tipo: TipoRelatorio
  titulo: string
  pedidoEm: string
  estado: Dto<'ExportacaoDto'>['estado']
  estadoRotulo: string
  estadoTom: 'accao' | 'sucesso' | 'perigo'
  progresso: number
  resultadoUrl: string | null
}
