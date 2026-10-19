import { useCallback, useTransition } from 'react'

/**
 * Transições entre ecrãs (guia 5.6): a linha clicada expande-se no painel de resumo e o painel
 * na ficha. Os três têm o mesmo nome de transição, um de cada vez no DOM.
 */
export const NOME_TRANSICAO_FICHA = 'ficha'

/**
 * Navega dentro de uma View Transition começada já, no clique. O router começa a sua só depois
 * de actualizar o local, e nessa altura o painel de origem pode já ter saído do ecrã; aqui o
 * navegador fotografa o estado antigo antes de qualquer mudança. A navegação tem de ir com
 * `viewTransition: false`, para o router não começar outra. Sem suporte, só navega.
 */
export function navegarComTransicao(navegar: () => Promise<unknown>) {
  if (typeof document.startViewTransition !== 'function') return void navegar()
  document.startViewTransition(async () => {
    await navegar()
  })
}

/** Cliques com Ctrl, ⌘, Shift ou botão do meio abrem noutro separador: deixar o navegador agir. */
export const cliqueSimples = (e: {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

/**
 * Mudanças de filtro, pesquisa, ordem e página como transições do React (guia 5.6): a
 * interface continua a responder enquanto a lista nova se prepara, e `aFiltrar` diz que há uma
 * a caminho (a lista fica translúcida e com aria-busy). Recebe a navegação já pronta, para os
 * tipos do router ficarem intactos.
 */
export function useFiltrarEmTransicao() {
  const [aFiltrar, iniciar] = useTransition()
  const filtrar = useCallback(
    (navegar: () => Promise<unknown>) =>
      iniciar(async () => {
        await navegar()
      }),
    [],
  )
  return { filtrar, aFiltrar }
}
