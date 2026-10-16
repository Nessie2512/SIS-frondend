import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

/**
 * Casca da aplicação em cache pelo service worker (guia 3.2, 5.8): abre depressa com ligação
 * fraca. Quando há nova versão, pergunta antes de recarregar para não perder o que se escreve.
 */
export function registarServiceWorker() {
  const actualizar = registerSW({
    onNeedRefresh() {
      toast(i18n._(msg`Há uma nova versão da Secretaria.`), {
        duration: Number.POSITIVE_INFINITY,
        action: { label: i18n._(msg`Actualizar`), onClick: () => void actualizar(true) },
      })
    },
  })
}
