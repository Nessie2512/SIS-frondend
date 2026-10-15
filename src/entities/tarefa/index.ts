// API pública da entidade: importar sempre daqui, nunca de ficheiros internos.
export type { EstadoTarefa, Tarefa } from './model/tipos'
export { paraTarefa } from './model/mapeadores'
export { useTarefasAcompanhadas } from './model/acompanhadas'
export { tarefaKeys, tarefaQuery } from './api/queries'
export { QuadroTarefas } from './ui/quadro-tarefas'
