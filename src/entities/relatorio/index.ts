// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { Exportacao, Relatorio, TipoRelatorio } from './model/tipos'
export { catalogoQuery, exportacoesQuery, relatorioKeys } from './api/queries'
