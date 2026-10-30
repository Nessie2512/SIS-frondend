import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { api } from '@/shared/api'
import { apiSis, naoDisponivel } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'

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
      if (eReal('anos')) naoDisponivel('ENCERRAR_ANO')
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
      if (eReal('anos')) naoDisponivel('REABRIR_ANO')
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
      if (eReal('anos')) {
        // O backend só guarda o ano de início e a designação; as datas não vão para o servidor
        const inicio = Number(datas.dataInicio.slice(0, 4))
        const { data } = await apiSis.POST('/academic-years', {
          body: { label: `${inicio}/${inicio + 1}`, startYear: inicio },
        })
        return { id: data!.uuid }
      }
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
      if (eReal('anos')) naoDisponivel('DUPLICAR_TURMAS')
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
      if (eReal('anos')) {
        await apiSis.PUT('/academic-years/{uuid}/activate', {
          params: { path: { uuid: anoLectivoId } },
        })
        return
      }
      const { data } = await api.POST('/anos-lectivos/{id}/activar', {
        params: { path: { id: anoLectivoId } },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}
