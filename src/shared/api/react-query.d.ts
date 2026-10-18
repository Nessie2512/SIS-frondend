import type { MessageDescriptor } from '@lingui/core'
import '@tanstack/react-query'

/**
 * Metadados das mutações (guia 5.5, 8.1). Uma mutação optimista que falha volta ao estado de
 * antes e anuncia-o de forma assertiva, com o motivo; `reversao` diz o que voltou atrás
 * (sem ele, uma frase geral).
 */
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      reversao?: MessageDescriptor
    }
  }
}
