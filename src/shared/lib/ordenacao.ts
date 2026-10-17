import type { SortingState as OrdenacaoTabela } from '@tanstack/react-table'

/**
 * Ordenação das listas no URL (guia 7.1): «nome» ou «-nome» (descendente). A tabela trabalha
 * com o estado do TanStack Table; o servidor recebe o campo da API correspondente.
 */
export function ordenacaoDoUrl(ordem: string | undefined): OrdenacaoTabela {
  if (!ordem) return []
  return [{ id: ordem.replace(/^-/, ''), desc: ordem.startsWith('-') }]
}

export function ordemParaUrl(ordenacao: OrdenacaoTabela): string | undefined {
  const [primeira] = ordenacao
  return primeira ? `${primeira.desc ? '-' : ''}${primeira.id}` : undefined
}

/** Traduz a coluna da tabela para o campo da API; colunas sem campo não ordenam no servidor. */
export function ordemParaApi(
  ordem: string | undefined,
  campos: Record<string, string>,
): string | undefined {
  if (!ordem) return undefined
  const desc = ordem.startsWith('-')
  const campo = campos[ordem.replace(/^-/, '')]
  return campo ? `${desc ? '-' : ''}${campo}` : undefined
}
