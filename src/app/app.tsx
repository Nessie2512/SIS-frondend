import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { criarQueryClient } from './query-client'
import { criarRouter } from './router'

const queryClient = criarQueryClient()
const router = criarRouter(queryClient)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* Notificações com acção Desfazer (guia 5.4) */}
      <Toaster position="bottom-right" closeButton />
    </QueryClientProvider>
  )
}
