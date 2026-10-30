import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { criarQueryClient } from '@/app/query-client'
import { server } from '@/mocks/node'

/** Hook com um QueryClient próprio, para testar mutações contra o backend SIS falso. */
export function hookComCliente<T>(usar: () => T) {
  const queryClient = criarQueryClient()
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(usar, { wrapper: envolver }) }
}

/** Regista os pedidos de escrita ao SIS: método, caminho e corpo. */
export function escutarEscritas(respostas: Record<string, unknown> = {}) {
  const pedidos: { metodo: string; caminho: string; corpo: unknown }[] = []
  const responder = async ({ request }: { request: Request }) => {
    const caminho = new URL(request.url).pathname.replace(/^\/sis/, '')
    const corpo = request.headers.get('content-type')?.includes('json')
      ? await request.json()
      : null
    pedidos.push({ metodo: request.method, caminho, corpo })
    return HttpResponse.json(respostas[`${request.method} ${caminho}`] ?? {}, {
      status: request.method === 'POST' ? 201 : 200,
    })
  }
  server.use(
    http.post('/sis/*', responder),
    http.patch('/sis/*', responder),
    http.put('/sis/*', responder),
    http.delete('/sis/*', responder),
  )
  return pedidos
}
