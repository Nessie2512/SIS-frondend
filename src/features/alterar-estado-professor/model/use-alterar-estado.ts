import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  comEstado,
  professorKeys,
  type EstadoProfessor,
  type PaginaProfessores,
  type Professor,
} from '@/entities/professor'
import { api } from '@/shared/api'

interface Pedido {
  professorId: string
  estado: EstadoProfessor
}

/**
 * Alterar o estado do professor (guia 5.2: inactivar e reactivar são optimistas com Desfazer).
 * Actualiza logo a ficha e as listas; reverte se o servidor recusar.
 */
export function useAlterarEstadoProfessor(anoLectivoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['professores', 'estado'],
    scope: { id: 'professores-estado' },
    mutationFn: async ({ professorId, estado }: Pedido) => {
      const { data } = await api.POST('/professores/{id}/estado', {
        params: { path: { id: professorId } },
        body: { estado },
      })
      return data!
    },
    onMutate: async ({ professorId, estado }) => {
      const detalhe = professorKeys.detalhe(professorId, anoLectivoId)
      await qc.cancelQueries({ queryKey: professorKeys.todos })
      const fichaAntes = qc.getQueryData<Professor>(detalhe)
      const listasAntes = qc.getQueriesData<PaginaProfessores>({ queryKey: professorKeys.listas() })
      qc.setQueryData<Professor>(detalhe, (p) => (p ? comEstado(p, estado) : p))
      qc.setQueriesData<PaginaProfessores>({ queryKey: professorKeys.listas() }, (pagina) =>
        pagina
          ? {
              ...pagina,
              professores: pagina.professores.map((p) =>
                p.id === professorId ? comEstado(p, estado) : p,
              ),
            }
          : pagina,
      )
      return { detalhe, fichaAntes, listasAntes }
    },
    onError: (_erro, _pedido, contexto) => {
      if (!contexto) return
      qc.setQueryData(contexto.detalhe, contexto.fichaAntes)
      for (const [chave, dados] of contexto.listasAntes) qc.setQueryData(chave, dados)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: professorKeys.todos }),
  })
}
