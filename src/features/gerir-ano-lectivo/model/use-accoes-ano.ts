import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { api } from '@/shared/api'

/**
 * Acções sobre o ano lectivo (guia 2.3, 5.1): todas pessimistas. Mudam o estado de muitos
 * registos e o modo de leitura, por isso, no fim, todos os dados e o contexto do router são
 * pedidos de novo.
 */
function useRecarregarTudo() {
  const qc = useQueryClient()
  const router = useRouter()
  return async () => {
    await qc.invalidateQueries()
    await router.invalidate()
  }
}

export function useEncerrarAno(anoLectivoId: string) {
  const recarregar = useRecarregarTudo()
  return useMutation({
    mutationKey: ['anos-lectivos', anoLectivoId, 'encerrar'],
    mutationFn: async (confirmacao: string) => {
      const { data } = await api.POST('/anos-lectivos/{id}/encerrar', {
        params: { path: { id: anoLectivoId } },
        body: { confirmacao },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useReabrirAno(anoLectivoId: string) {
  const recarregar = useRecarregarTudo()
  return useMutation({
    mutationKey: ['anos-lectivos', anoLectivoId, 'reabrir'],
    mutationFn: async (motivo: string) => {
      const { data } = await api.POST('/anos-lectivos/{id}/reabrir', {
        params: { path: { id: anoLectivoId } },
        body: { motivo },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useCriarAno() {
  const recarregar = useRecarregarTudo()
  return useMutation({
    mutationKey: ['anos-lectivos', 'criar'],
    mutationFn: async (datas: { dataInicio: string; dataFim: string }) => {
      const { data } = await api.POST('/anos-lectivos', { body: datas })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useDuplicarTurmas(anoLectivoId: string) {
  const recarregar = useRecarregarTudo()
  return useMutation({
    mutationKey: ['anos-lectivos', anoLectivoId, 'duplicar-turmas'],
    mutationFn: async () => {
      const { data } = await api.POST('/anos-lectivos/{id}/duplicar-turmas', {
        params: { path: { id: anoLectivoId } },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useActivarAno(anoLectivoId: string) {
  const recarregar = useRecarregarTudo()
  return useMutation({
    mutationKey: ['anos-lectivos', anoLectivoId, 'activar'],
    mutationFn: async () => {
      const { data } = await api.POST('/anos-lectivos/{id}/activar', {
        params: { path: { id: anoLectivoId } },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}
