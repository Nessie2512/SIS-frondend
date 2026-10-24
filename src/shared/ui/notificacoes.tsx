import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { TEMPOS } from '@/shared/config/constantes'

type Sonner = typeof import('sonner')
let modulo: Promise<Sonner> | undefined

/**
 * O Sonner fica fora do JavaScript inicial (guia 1.2, 3.2): nenhuma notificação aparece antes
 * de um gesto, por isso carrega-se logo a seguir à primeira pintura (RegiaoNotificacoes) e,
 * no pior caso, na primeira notificação. É sempre o mesmo módulo, e por isso o mesmo estado.
 */
export const carregarNotificacoes = () => (modulo ??= import('sonner'))

const comToast = (mostrar: (toast: Sonner['toast']) => void) =>
  void carregarNotificacoes().then((m) => mostrar(m.toast))

/**
 * Notificações (guia 5.4, 6.2). Frases curtas e calmas, sem exclamações.
 * A pausa em hover e foco e a gestão de foco vêm do Sonner.
 */
export const notificar = {
  sucesso: (mensagem: string) => comToast((toast) => toast.success(mensagem)),
  info: (mensagem: string) => comToast((toast) => toast(mensagem)),
  erro: (mensagem: string, tentarDeNovo?: () => void) => {
    // A etiqueta traduz-se já, no mesmo passo que a mensagem
    const accao = tentarDeNovo
      ? { label: i18n._(msg`Tentar de novo`), onClick: tentarDeNovo }
      : undefined
    comToast((toast) => toast.error(mensagem, { action: accao }))
  },
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
  // Fica disponível já para ⌘Z, mesmo antes de a notificação aparecer
  ultimoDesfazer = desfazer
  const etiqueta = i18n._(msg`Desfazer`)
  comToast((toast) =>
    toast(mensagem, {
      duration: TEMPOS.desfazer,
      action: { label: etiqueta, onClick: desfazer },
      onAutoClose: () => {
        if (ultimoDesfazer === desfazer) ultimoDesfazer = null
      },
    }),
  )
  return { desfazer }
}

/** Devolve true se havia uma acção para desfazer. */
export function desfazerUltima(): boolean {
  if (!ultimoDesfazer) return false
  ultimoDesfazer()
  return true
}
