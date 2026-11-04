import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { http, HttpResponse, type JsonBodyType } from 'msw'
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

export interface PedidoEscrita {
  metodo: string
  caminho: string
  corpo: unknown
}

/**
 * Regista os pedidos de escrita ao SIS: método, caminho e corpo. Como o backend real, responde
 * sem corpo, a não ser que `respostas` diga o que devolver para "MÉTODO /caminho".
 * `aoEscrever` deixa o teste actualizar o estado do backend falso (ex.: a lista de turmas).
 */
export function escutarEscritas(
  respostas: Record<string, unknown> = {},
  aoEscrever?: (pedido: PedidoEscrita) => void,
) {
  const pedidos: PedidoEscrita[] = []
  const responder = async ({ request }: { request: Request }) => {
    const caminho = new URL(request.url).pathname.replace(/^\/sis/, '')
    const corpo = request.headers.get('content-type')?.includes('json')
      ? await request.json()
      : null
    const pedido = { metodo: request.method, caminho, corpo }
    pedidos.push(pedido)
    aoEscrever?.(pedido)
    const status = request.method === 'POST' ? 201 : 200
    const chave = `${request.method} ${caminho}`
    return chave in respostas
      ? HttpResponse.json(respostas[chave] as JsonBodyType, { status })
      : new HttpResponse(null, { status })
  }
  server.use(
    http.post('/sis/*', responder),
    http.patch('/sis/*', responder),
    http.put('/sis/*', responder),
    http.delete('/sis/*', responder),
  )
  return pedidos
}
