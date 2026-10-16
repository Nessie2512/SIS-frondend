import { useMutation, useQueryClient } from '@tanstack/react-query'
import { disciplinaKeys, type Disciplina, type EstadoDisciplina } from '@/entities/disciplina'
import { api } from '@/shared/api'
import type { DadosDisciplina } from './esquema'

const paraModelo = (d: Omit<Disciplina, 'activa'>): Disciplina => ({
  ...d,
  activa: d.estado === 'ACTIVA',
})

/** Criar disciplina (semi-optimista: entra na lista quando o servidor confirma). */
export function useCriarDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['disciplinas', 'criar'],
    mutationFn: async (dados: DadosDisciplina) => {
      const { data } = await api.POST('/disciplinas', { body: dados })
      return paraModelo(data!)
    },
    onSuccess: (nova) =>
      qc.setQueryData<Disciplina[]>(disciplinaKeys.todas, (lista = []) =>
        [...lista, nova].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: disciplinaKeys.todas }),
  })
}

/** Inactivar e reactivar (guia 5.2: optimista com Desfazer). */
export function useAlterarEstadoDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['disciplinas', 'estado'],
    scope: { id: 'disciplinas' },
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoDisciplina }) => {
      const { data } = await api.POST('/disciplinas/{id}/estado', {
        params: { path: { id } },
        body: { estado },
      })
      return paraModelo(data!)
    },
    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: disciplinaKeys.todas })
      const antes = qc.getQueryData<Disciplina[]>(disciplinaKeys.todas)
      qc.setQueryData<Disciplina[]>(disciplinaKeys.todas, (lista = []) =>
        lista.map((d) => (d.id === id ? { ...d, estado, activa: estado === 'ACTIVA' } : d)),
      )
      return { antes }
    },
    onError: (_erro, _pedido, contexto) => qc.setQueryData(disciplinaKeys.todas, contexto?.antes),
    onSettled: () => qc.invalidateQueries({ queryKey: disciplinaKeys.todas }),
  })
}

/** Eliminar só o que nunca foi usado; o servidor recusa com DISCIPLINA_EM_USO (guia 2.4). */
export function useEliminarDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['disciplinas', 'eliminar'],
    scope: { id: 'disciplinas' },
    mutationFn: async (disciplina: Disciplina) => {
      await api.DELETE('/disciplinas/{id}', { params: { path: { id: disciplina.id } } })
    },
    onSuccess: (_r, disciplina) =>
      qc.setQueryData<Disciplina[]>(disciplinaKeys.todas, (lista = []) =>
        lista.filter((d) => d.id !== disciplina.id),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: disciplinaKeys.todas }),
  })
}
