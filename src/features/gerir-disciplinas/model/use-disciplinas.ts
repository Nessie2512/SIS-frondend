import { useMutation, useQueryClient } from '@tanstack/react-query'
import { disciplinaKeys, type Disciplina, type EstadoDisciplina } from '@/entities/disciplina'
import { api } from '@/shared/api'
import { apiSis, sisKeys } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'
import type { DadosDisciplina } from './esquema'

const paraModelo = (d: Omit<Disciplina, 'activa'>): Disciplina => ({
  ...d,
  activa: d.estado === 'ACTIVA',
})

/** Backend SIS: resposta → modelo (uma disciplina acabada de criar ainda não está em uso). */
const doSis = (d: { uuid: string; name: string; code: string; isActive: boolean }): Disciplina => ({
  id: d.uuid,
  nome: d.name,
  sigla: d.code,
  estado: d.isActive ? 'ACTIVA' : 'INACTIVA',
  activa: d.isActive,
  emUso: false,
})

/** Criar disciplina (semi-optimista: entra na lista quando o servidor confirma). */
export function useCriarDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['disciplinas', 'criar'],
    mutationFn: async (dados: DadosDisciplina) => {
      if (eReal('curriculo')) {
        const { data } = await apiSis.POST('/subjects', {
          body: { name: dados.nome, code: dados.sigla },
        })
        return doSis(data!)
      }
      const { data } = await api.POST('/disciplinas', { body: dados })
      return paraModelo(data!)
    },
    onSuccess: (nova) =>
      qc.setQueryData<Disciplina[]>(disciplinaKeys.todas, (lista = []) =>
        [...lista, nova].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
      ),
    onSettled: () => recarregar(qc),
  })
}

/** Inactivar e reactivar (guia 5.2: optimista com Desfazer). */
export function useAlterarEstadoDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['disciplinas', 'estado'],
    scope: { id: 'disciplinas' },
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoDisciplina }) => {
      if (eReal('curriculo')) {
        const { data } = await apiSis.PATCH('/subjects/{id}', {
          params: { path: { id } },
          body: { isActive: estado === 'ACTIVA' },
        })
        return doSis(data!)
      }
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
    onSettled: () => recarregar(qc),
  })
}

/** Eliminar só o que nunca foi usado; o servidor recusa com DISCIPLINA_EM_USO (guia 2.4). */
export function useEliminarDisciplina() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['disciplinas', 'eliminar'],
    scope: { id: 'disciplinas' },
    mutationFn: async (disciplina: Disciplina) => {
      // Backend SIS: DELETE /subjects/{id} desactiva (não apaga); a lista mostra-a inactiva
      if (eReal('curriculo')) {
        await apiSis.DELETE('/subjects/{id}', { params: { path: { id: disciplina.id } } })
        return
      }
      await api.DELETE('/disciplinas/{id}', { params: { path: { id: disciplina.id } } })
    },
    onSuccess: (_r, disciplina) =>
      qc.setQueryData<Disciplina[]>(disciplinaKeys.todas, (lista = []) =>
        lista.filter((d) => d.id !== disciplina.id),
      ),
    onSettled: () => recarregar(qc),
  })
}

/** Depois de escrever: a lista da interface e as listas em bruto do SIS (classes contam o uso). */
function recarregar(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: sisKeys.lista('subjects') })
  return qc.invalidateQueries({ queryKey: disciplinaKeys.todas })
}
