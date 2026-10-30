import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classeKeys } from '@/entities/classe'
import { api } from '@/shared/api'
import { apiSis, idNumerico, naoDisponivel, referenciaSis, sisKeys } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'

/** Depois de qualquer mudança, a árvore e as listas de classes de todos os ecrãs. */
function useRecarregar() {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: sisKeys.todas })
    await qc.invalidateQueries({ queryKey: classeKeys.todas })
  }
}

export function useCriarCiclo() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['ciclos', 'criar'],
    mutationFn: async (designacao: string) => {
      if (eReal('curriculo')) {
        await apiSis.POST('/academic-levels', { body: { name: designacao } })
        return
      }
      const { data } = await api.POST('/ciclos', { body: { designacao } })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useCriarClasse() {
  const recarregar = useRecarregar()
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['classes', 'criar'],
    mutationFn: async (pedido: { cicloId: string; designacao: string }) => {
      if (eReal('curriculo')) {
        // O backend refere o ciclo pelo id numérico
        const niveis = await qc.fetchQuery(referenciaSis.niveis())
        await apiSis.POST('/grades', {
          body: { name: pedido.designacao, academicLevelId: idNumerico(niveis, pedido.cicloId) },
        })
        return
      }
      const { data } = await api.POST('/classes', { body: pedido })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useRenomearClasse() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['classes', 'renomear'],
    mutationFn: async ({ id, designacao }: { id: string; designacao: string }) => {
      if (eReal('curriculo')) {
        await apiSis.PATCH('/grades/{id}', { params: { path: { id } }, body: { name: designacao } })
        return
      }
      const { data } = await api.PATCH('/classes/{id}', {
        params: { path: { id } },
        body: { designacao },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useEliminarClasse() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['classes', 'eliminar'],
    mutationFn: async (id: string) => {
      // Backend SIS: as classes só se desactivam
      if (eReal('curriculo')) naoDisponivel('ELIMINAR_CLASSE')
      await api.DELETE('/classes/{id}', { params: { path: { id } } })
    },
    onSuccess: recarregar,
  })
}

export function useEstadoClasse() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['classes', 'estado'],
    mutationFn: async ({ id, estado }: { id: string; estado: 'ACTIVA' | 'INACTIVA' }) => {
      if (eReal('curriculo')) {
        // Desactivar existe; reactivar ainda não (UpdateGradeDto não tem isActive)
        if (estado === 'ACTIVA') naoDisponivel('REACTIVAR_CLASSE')
        await apiSis.DELETE('/grades/{id}/deactivate', { params: { path: { id } } })
        return
      }
      const { data } = await api.POST('/classes/{id}/estado', {
        params: { path: { id } },
        body: { estado },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}
