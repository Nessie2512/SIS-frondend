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

export const PAGINACAO = { porPagina: 50, maximo: 100 } as const

/** Minutos sem interacção até bloquear o ecrã (guia 4.4); configurável por escola mais tarde. */
export const INACTIVIDADE_MINUTOS = 15
