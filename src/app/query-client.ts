import { QueryClient } from '@tanstack/react-query'
import { eApiError } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: FRESCURA.lista,
        // Repetição automática só para leituras e só em falhas transitórias (guia 5.5)
        retry: (tentativas, erro) => tentativas < 2 && (!eApiError(erro) || erro.eTransitorio),
        retryDelay: (tentativa) => Math.min(1_000 * 2 ** tentativa, 8_000),
      },
      mutations: {
        // Escritas só se repetem com Idempotency-Key, explicitamente
        retry: 0,
      },
    },
  })
}
