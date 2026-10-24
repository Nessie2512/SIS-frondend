import { lazy, Suspense } from 'react'
import { carregarNotificacoes } from './notificacoes'

const Toaster = lazy(() =>
  carregarNotificacoes().then((m) => ({
    default: () => <m.Toaster position="bottom-right" closeButton />,
  })),
)

/** Onde aparecem as notificações (guia 5.4); montar uma vez na raiz. Carrega à parte. */
export function RegiaoNotificacoes() {
  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  )
}
