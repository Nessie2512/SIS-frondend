import {
  armazemIndexedDb,
  ESPERA_MAXIMA_DISCO_MS,
  guardarReferenciaAoMudar,
  restaurarReferencia,
} from './persistencia'
import { criarQueryClient } from './query-client'
import { criarRouter } from './router'

/** Uma cache e um router para toda a aplicação. */
export const queryClient = criarQueryClient()
export const router = criarRouter(queryClient)

/**
 * Antes de mostrar a aplicação: repõe os dados de referência guardados em disco (guia 5.8) e
 * passa a guardá-los quando mudam. Nunca espera mais de 300 ms pelo disco.
 */
export async function prepararCache() {
  const armazem = armazemIndexedDb()
  if (!armazem) return
  await Promise.race([
    restaurarReferencia(queryClient, armazem),
    new Promise((resolver) => setTimeout(resolver, ESPERA_MAXIMA_DISCO_MS)),
  ])
  guardarReferenciaAoMudar(queryClient, armazem)
}
