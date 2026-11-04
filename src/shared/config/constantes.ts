/** Línguas da interface (guia 8.2). A primeira é a base: as mensagens são escritas nela. */
export const LINGUAS = ['pt-AO', 'en'] as const
export type Lingua = (typeof LINGUAS)[number]
export const LINGUA_BASE: Lingua = 'pt-AO'

/** Chave das preferências no localStorage; também lida pelo script do tema em index.html. */
export const CHAVE_PREFERENCIAS = 'secretaria:preferencias'

/**
 * Língua escolhida em Definições, lida directamente do localStorage: é precisa antes de a
 * aplicação arrancar (catálogo e formatos de data). Sem escolha, a língua base.
 */
export function linguaGuardada(): Lingua {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) ?? 'null')?.state
      ?.lingua
    return (LINGUAS as readonly unknown[]).includes(valor) ? (valor as Lingua) : LINGUA_BASE
  } catch {
    return LINGUA_BASE
  }
}

/**
 * Locale dos formatos (datas, números, nomes de meses). Em inglês, o britânico: dia antes do
 * mês, como em Angola. Fixo durante a sessão: mudar de língua recarrega a aplicação.
 */
export const LOCALE = linguaGuardada() === 'en' ? 'en-GB' : 'pt-AO'
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
