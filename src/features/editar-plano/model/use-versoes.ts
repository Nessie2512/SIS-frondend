import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraPlano, planoKeys, planoQuery, type Plano } from '@/entities/plano'
import { api, eApiError } from '@/shared/api'

/** Nova versão a partir do vigente: um rascunho editável, igual ao vigente. */
export function useNovaVersao() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['plano', 'nova-versao'],
    mutationFn: async (vigente: Plano) => {
      try {
        const { data } = await api.POST('/planos/{id}/nova-versao', {
          params: { path: { id: vigente.id } },
        })
        return { plano: paraPlano(data!), existente: false }
      } catch (erro) {
        // Já há rascunho: abre-se o existente em vez de criar outro (guia 2.4)
        const planoId = eApiError(erro) ? erro.dados.planoId : undefined
        if (
          eApiError(erro) &&
          erro.temCodigo('RASCUNHO_EXISTENTE') &&
          typeof planoId === 'string'
        ) {
          return { plano: await qc.fetchQuery(planoQuery(planoId)), existente: true }
        }
        throw erro
      }
    },
    onSuccess: ({ plano }) => {
      qc.setQueryData(planoKeys.detalhe(plano.id), plano)
      return qc.invalidateQueries({ queryKey: planoKeys.daClasse(plano.classeId) })
    },
  })
}

/** Publicar (irreversível): o rascunho passa a vigente e o vigente anterior fica arquivado. */
export function usePublicarPlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['plano', 'publicar'],
    mutationFn: async (rascunho: Plano) => {
      const revisao = qc.getQueryData<Plano>(planoKeys.detalhe(rascunho.id))?.revisao
      const { data } = await api.POST('/planos/{id}/publicar', {
        params: { path: { id: rascunho.id }, header: { 'If-Match': revisao ?? rascunho.revisao } },
      })
      return paraPlano(data!)
    },
    onSuccess: (plano) => {
      qc.setQueryData(planoKeys.detalhe(plano.id), plano)
      return qc.invalidateQueries({ queryKey: planoKeys.todos })
    },
  })
}
