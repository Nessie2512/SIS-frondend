import { useMutation, useQueryClient } from '@tanstack/react-query'
import { vistaKeys, type EcraVista, type FiltrosVista, type Vista } from '@/entities/vista'
import { api } from '@/shared/api'

/** Guardar a vista actual (semi-optimista: entra na lista quando o servidor confirma). */
export function useGuardarVista(ecra: EcraVista) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['vistas', ecra, 'guardar'],
    mutationFn: async ({ nome, filtros }: { nome: string; filtros: FiltrosVista }) => {
      const { data } = await api.POST('/vistas', { body: { ecra, nome, filtros } })
      return { ...data!, filtros: { ...data!.filtros } } satisfies Vista
    },
    onSuccess: (vista) =>
      qc.setQueryData<Vista[]>(vistaKeys.doEcra(ecra), (antes = []) => [...antes, vista]),
    onSettled: () => qc.invalidateQueries({ queryKey: vistaKeys.doEcra(ecra) }),
  })
}

/** Apagar uma vista (optimista: sai logo da lista; reverte se o servidor recusar). */
export function useApagarVista(ecra: EcraVista) {
  const qc = useQueryClient()
  const chave = vistaKeys.doEcra(ecra)
  return useMutation({
    mutationKey: ['vistas', ecra, 'apagar'],
    scope: { id: `vistas-${ecra}` },
    mutationFn: async (vista: Vista) => {
      await api.DELETE('/vistas/{id}', { params: { path: { id: vista.id } } })
    },
    onMutate: async (vista) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Vista[]>(chave)
      qc.setQueryData<Vista[]>(chave, (lista = []) => lista.filter((v) => v.id !== vista.id))
      return { antes }
    },
    onError: (_erro, _vista, contexto) => qc.setQueryData(chave, contexto?.antes),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}
