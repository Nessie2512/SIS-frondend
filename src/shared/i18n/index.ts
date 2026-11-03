import { i18n } from '@lingui/core'
import { linguaGuardada, type Lingua } from '@/shared/config/constantes'

/**
 * Catálogos por língua, cada um num ficheiro à parte (guia 8.2): descarrega-se só o da língua
 * activa, fora do JavaScript inicial, e em paralelo com o arranque. O plugin do Lingui compila
 * o .po na importação; não há passo de compilação manual. Novas línguas entram aqui e em
 * LINGUAS (shared/config/constantes.ts).
 */
const CATALOGOS: Record<Lingua, () => Promise<{ messages: Record<string, unknown> }>> = {
  'pt-AO': () => import('./locales/pt-AO/messages.po'),
  en: () => import('./locales/en/messages.po'),
}

export type { Lingua }

/** Carrega e activa o catálogo; a aplicação só se mostra depois disto (main.tsx). */
export async function activarLingua(lingua: Lingua = linguaGuardada()) {
  const { messages } = await CATALOGOS[lingua]()
  i18n.loadAndActivate({ locale: lingua, messages: messages as never })
  document.documentElement.lang = lingua
}

export { i18n }
