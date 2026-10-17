import { useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys, paraOcorrencia, type Ocorrencia } from '@/entities/estudante'
import { api } from '@/shared/api'
import type { DadosOcorrencia } from './esquema'

/** Registar ocorrência (semi-optimista: entra na lista quando o servidor confirma). */
export function useRegistarOcorrencia(estudanteId: string) {
  const qc = useQueryClient()
  const chave = estudanteKeys.ocorrencias(estudanteId)
  return useMutation({
    mutationKey: ['ocorrencias', 'registar'],
    mutationFn: async (dados: DadosOcorrencia) => {
      const { data } = await api.POST('/estudantes/{id}/ocorrencias', {
        params: { path: { id: estudanteId } },
        body: dados,
      })
      return paraOcorrencia(data!)
    },
    onSuccess: (nova) =>
      qc.setQueryData<Ocorrencia[]>(chave, (lista = []) =>
        [nova, ...lista].sort((a, b) => b.data.localeCompare(a.data)),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}
