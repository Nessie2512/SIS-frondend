export const LOCALE = 'pt-AO'
export const FUSO_HORARIO = 'Africa/Luanda'

/** Frescura por tipo de dado (guia 5.6). */
export const FRESCURA = {
  referencia: 10 * 60_000, // ciclos, classes, disciplinas, ano activo
  lista: 30_000, // listas e fichas
  painel: 60_000,
  pesquisa: 0,
} as const

/** Tempos de interface (guia 4.6, 5.4, 5.6). */
export const TEMPOS = {
  esqueletoAtraso: 120,
  esqueletoMinimo: 300,
  desfazer: 8_000,
  pesquisaEspera: 120,
  dica: 400,
} as const

/** Consulta de tarefas longas (guia 5.7): intervalo crescente, com tecto, e pausa em segundo plano. */
export const SONDAGEM_TAREFAS = { inicial: 1_000, factor: 1.5, maximo: 10_000 } as const

export const PAGINACAO = { porPagina: 50, maximo: 100 } as const

/** Minutos sem interacção até bloquear o ecrã (guia 4.4); configurável por escola mais tarde. */
export const INACTIVIDADE_MINUTOS = 15

/** Curva padrão de movimento, igual a --ease-padrao nos tokens (para APIs em JavaScript) */
export const CURVA_PADRAO = 'cubic-bezier(0.2, 0, 0, 1)'
