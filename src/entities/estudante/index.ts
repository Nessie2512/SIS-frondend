export type {
  DocumentoEstudante,
  Encarregado,
  EstadoEstudante,
  Estudante,
  EstudanteResumo,
  EventoPercurso,
  Ocorrencia,
  TipoOcorrencia,
  FiltrosEstudantes,
  PaginaEstudantes,
} from './model/tipos'
export {
  formatarTelefone,
  paraEstudante,
  paraEstudanteResumo,
  paraEncarregado,
  paraOcorrencia,
  TIPOS_OCORRENCIA,
} from './model/mapeadores'
export {
  documentosQuery,
  duplicadosQuery,
  encarregadosQuery,
  estudanteKeys,
  estudanteQuery,
  estudantesQuery,
  ocorrenciasQuery,
  percursoQuery,
} from './api/queries'
export { EtiquetaEstadoEstudante } from './ui/etiqueta-estado-estudante'
