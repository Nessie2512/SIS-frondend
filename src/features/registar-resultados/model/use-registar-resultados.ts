import { useMutation, useQueryClient } from '@tanstack/react-query'
import { turmaKeys } from '@/entities/turma'
import { api, type components } from '@/shared/api'

type Resultado = components['schemas']['ResultadoFinal']

/**
 * Guardar os resultados finais da turma de uma vez (guia 5.1): pessimista, porque afecta
 * muitos registos e decide o encerramento e a renovação. A tabela só muda com a resposta.
 */
export function useRegistarResultados(turmaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['turmas', turmaId, 'resultados'],
    mutationFn: async (resultados: { matriculaId: string; resultado: Resultado | null }[]) => {
      const { data } = await api.PUT('/turmas/{id}/resultados', {
        params: { path: { id: turmaId } },
        body: { resultados },
      })
      return data!
    },
    onSuccess: (lista) => {
      qc.setQueryData(turmaKeys.resultados(turmaId), lista)
      // O encerramento do ano conta os resultados em falta
      void qc.invalidateQueries({ queryKey: ['anos-lectivos'] })
    },
  })
}
