import { i18n } from '@lingui/core'
import { LOCALE } from '@/shared/config/constantes'

/**
 * Catálogos por língua, cada um num ficheiro à parte (guia 8.2): descarrega-se só o da língua
 * activa, fora do JavaScript inicial, e em paralelo com o arranque. O plugin do Lingui compila
 * o .po na importação; não há passo de compilação manual. Novas línguas entram aqui.
 */
const CATALOGOS = {
  'pt-AO': () => import('./locales/pt-AO/messages.po'),
} as const

export type Lingua = keyof typeof CATALOGOS

/** Carrega e activa o catálogo; a aplicação só se mostra depois disto (main.tsx). */
export async function activarLingua(lingua: Lingua = LOCALE) {
  const { messages } = await CATALOGOS[lingua]()
  i18n.loadAndActivate({ locale: lingua, messages })
}

export { i18n }
