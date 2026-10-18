import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraTurma, turmaKeys, type PaginaTurmas } from '@/entities/turma'
import { api, type components } from '@/shared/api'

export type NovaTurma = Omit<components['schemas']['NovaTurmaDto'], 'anoLectivoId'> & {
  classeDesignacao: string
}

/**
 * Criar turma (guia 5.1): semi-optimista. A linha aparece logo na lista, com a designação a
 * carregar; se o servidor recusar, desaparece e o formulário volta com o que foi escrito.
 */
export function useCriarTurma(anoLectivoId: string) {
  const qc = useQueryClient()
  const listas = [...turmaKeys.todas, 'lista']
  return useMutation({
    mutationKey: ['turmas', 'criar'],
    mutationFn: async ({ classeDesignacao: _, ...dados }: NovaTurma & { chave: string }) => {
      const { chave, ...corpo } = dados
      const { data } = await api.POST('/turmas', {
        params: { header: { 'Idempotency-Key': chave } },
        body: { ...corpo, anoLectivoId },
      })
      return paraTurma(data!)
    },
    onMutate: async (nova) => {
      await qc.cancelQueries({ queryKey: listas })
      const antes = qc.getQueriesData<PaginaTurmas>({ queryKey: listas })
      const provisoria = {
        ...paraTurma({
          id: 'turma-a-criar',
          designacao: '…',
          classeId: nova.classeId,
          classeDesignacao: nova.classeDesignacao,
          turno: nova.turno,
          sala: nova.sala ?? null,
          lotacaoMaxima: nova.lotacaoMaxima,
          inscritos: 0,
          estado: 'ACTIVA',
          directorTurma: null,
        }),
        aGuardar: true,
      }
      qc.setQueriesData<PaginaTurmas>({ queryKey: listas }, (p) =>
        p ? { ...p, turmas: [...p.turmas, provisoria], total: p.total + 1 } : p,
      )
      return { antes }
    },
    onError: (_e, _v, contexto) => {
      for (const [chave, dados] of contexto?.antes ?? []) qc.setQueryData(chave, dados)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: turmaKeys.todas }),
  })
}

/** Encerrar turma: pessimista, com motivo; só sem estudantes inscritos. */
export function useEncerrarTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['turmas', 'encerrar'],
    mutationFn: async ({ turmaId, motivo }: { turmaId: string; motivo: string }) => {
      const { data } = await api.POST('/turmas/{id}/encerrar', {
        params: { path: { id: turmaId } },
        body: { motivo },
      })
      return paraTurma(data!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: turmaKeys.todas }),
  })
}
