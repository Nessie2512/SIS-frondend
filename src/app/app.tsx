import { RouterProvider } from '@tanstack/react-router'
import { queryClient, router } from './instancias'
import { RegiaoNotificacoes } from '@/shared/ui'
import { Providers } from './providers'

export function App() {
  return (
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
      {/* Notificações com acção Desfazer (guia 5.4) */}
      <RegiaoNotificacoes />
    </Providers>
  )
}
