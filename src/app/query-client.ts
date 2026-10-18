import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { MutationCache, QueryClient } from '@tanstack/react-query'
import { eApiError } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'

export function criarQueryClient() {
  return new QueryClient({
    // Reversões anunciam-se de forma assertiva, com o motivo (guia 8.1). Uma mutação é
    // optimista quando o onMutate devolve o estado de antes: se falhar, a interface volta atrás
    // e quem usa leitor de ecrã tem de o saber, mesmo sem olhar para a notificação
    mutationCache: new MutationCache({
      onError: (erro, _variaveis, estadoAntes, mutacao) => {
        if (estadoAntes === undefined) return
        const reversao =
          mutacao.meta?.reversao ?? msg`A alteração não foi guardada e voltou ao que estava.`
        anunciar.assertivo(`${i18n._(reversao)} ${mensagemDeErro(erro)}`)
      },
    }),
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
