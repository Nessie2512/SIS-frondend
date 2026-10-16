import { i18n } from '@lingui/core'
import { LOCALE } from '@/shared/config/constantes'
// O plugin do Lingui compila o .po na importação; não há passo de compilação manual
import { messages } from './locales/pt-AO/messages.po'

/** Língua base: pt-AO (guia 8.2). Novas línguas entram como novos catálogos e um selector. */
i18n.loadAndActivate({ locale: LOCALE, messages })

export { i18n }
