import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { queryClient, router } from './instancias'
import { Providers } from './providers'

export function App() {
  return (
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
      {/* Notificações com acção Desfazer (guia 5.4) */}
      <Toaster position="bottom-right" closeButton />
    </Providers>
  )
}
