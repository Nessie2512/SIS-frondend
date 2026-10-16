import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import { criarQueryClient } from './query-client'
import { criarRouter } from './router'

const queryClient = criarQueryClient()
const router = criarRouter(queryClient)

export function App() {
  return (
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
      {/* Notificações com acção Desfazer (guia 5.4) */}
      <Toaster position="bottom-right" closeButton />
    </Providers>
  )
}
