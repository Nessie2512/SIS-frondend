type Causa = 'enter' | 'stay' | 'preload'

/**
 * Loaders de listas (guia 5.6, 7.1): ao entrar no ecrã espera-se pelos dados, com esqueleto;
 * ao mudar pesquisa, filtros ou página no mesmo ecrã não se espera. As queries mantêm os
 * resultados anteriores (keepPreviousData) e o ecrã não é trocado pelo esqueleto, que levaria
 * consigo o campo de pesquisa e o que se está a escrever.
 */
export function esperarSoAoEntrar(causa: Causa, pedido: Promise<unknown> | null) {
  if (!pedido) return null
  if (causa === 'stay') {
    // Um erro aparece no próprio ecrã, pela query; aqui só se evita a rejeição sem tratamento
    void pedido.catch(() => undefined)
    return null
  }
  return pedido
}
