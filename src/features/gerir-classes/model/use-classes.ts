import { useMutation, useQueryClient } from '@tanstack/react-query'
import { classeKeys } from '@/entities/classe'
import { api } from '@/shared/api'

/** Depois de qualquer mudança, a árvore e as listas de classes de todos os ecrãs. */
function useRecarregar() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: classeKeys.todas })
}

export function useCriarCiclo() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['ciclos', 'criar'],
    mutationFn: async (designacao: string) => {
      const { data } = await api.POST('/ciclos', { body: { designacao } })
      return data!
    },
    onSuccess: recarregar,
  })
}

export function useCriarClasse() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['classes', 'criar'],
    mutationFn: async (pedido: { cicloId: string; designacao: string }) => {
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
      const { data } = await api.POST('/classes/{id}/estado', {
        params: { path: { id } },
        body: { estado },
      })
      return data!
    },
    onSuccess: recarregar,
  })
}
