import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { toast } from 'sonner'
import { TEMPOS } from '@/shared/config/constantes'

/**
 * Notificações (guia 5.4, 6.2). Frases curtas e calmas, sem exclamações.
 * A pausa em hover e foco e a gestão de foco vêm do Sonner.
 */
export const notificar = {
  sucesso: (mensagem: string) => toast.success(mensagem),
  info: (mensagem: string) => toast(mensagem),
  erro: (mensagem: string, tentarDeNovo?: () => void) =>
    toast.error(mensagem, {
      action: tentarDeNovo
        ? { label: i18n._(msg`Tentar de novo`), onClick: tentarDeNovo }
        : undefined,
    }),
}

let ultimoDesfazer: (() => void) | null = null

/**
 * Acção reversível: faz-se logo e oferece Desfazer durante 8 s (guia 5.4).
 * O atalho ⌘Z / Ctrl+Z chama `desfazerUltima()`.
 */
export function notificarComDesfazer(mensagem: string, aoDesfazer: () => void) {
  let usado = false
  const desfazer = () => {
    if (usado) return
    usado = true
    ultimoDesfazer = null
    aoDesfazer()
  }
  ultimoDesfazer = desfazer
  const id = toast(mensagem, {
    duration: TEMPOS.desfazer,
    action: { label: i18n._(msg`Desfazer`), onClick: desfazer },
    onAutoClose: () => {
      if (ultimoDesfazer === desfazer) ultimoDesfazer = null
    },
  })
  return { id, desfazer }
}

/** Devolve true se havia uma acção para desfazer. */
export function desfazerUltima(): boolean {
  if (!ultimoDesfazer) return false
  ultimoDesfazer()
  return true
}
