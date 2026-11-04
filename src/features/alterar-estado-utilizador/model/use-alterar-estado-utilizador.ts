import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  administracaoKeys,
  comEstadoConta,
  type Conta,
  type EstadoUtilizador,
} from '@/entities/administracao'
import { api } from '@/shared/api'
import { apiSis, naoDisponivel, sisKeys } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'

interface Pedido {
  utilizadorId: string
  estado: EstadoUtilizador
}

/**
 * Activar ou desactivar uma conta (guia 5.2): optimista, com Desfazer.
 * Actualiza logo as listas de utilizadores; reverte se o servidor recusar.
 */
export function useAlterarEstadoUtilizador() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['utilizadores', 'estado'],
    scope: { id: 'utilizadores-estado' },
    mutationFn: async ({ utilizadorId, estado }: Pedido) => {
      if (eReal('utilizadores')) {
        // Backend SIS: só desactivar existe (DELETE /users/{uuid}); reactivar ainda não
        if (estado !== 'INACTIVO') naoDisponivel('REACTIVAR_CONTA')
        await apiSis.DELETE('/users/{uuid}', { params: { path: { uuid: utilizadorId } } })
        return null
      }
      const { data } = await api.POST('/utilizadores/{id}/estado', {
        params: { path: { id: utilizadorId } },
        body: { estado },
      })
      return data!
    },
    onMutate: async ({ utilizadorId, estado }) => {
      await qc.cancelQueries({ queryKey: administracaoKeys.contas() })
      const antes = qc.getQueriesData<Conta[]>({ queryKey: administracaoKeys.contas() })
      qc.setQueriesData<Conta[]>({ queryKey: administracaoKeys.contas() }, (lista) =>
        lista?.map((c) => (c.id === utilizadorId ? comEstadoConta(c, estado) : c)),
      )
      return { antes }
    },
    onError: (_erro, _pedido, contexto) => {
      for (const [chave, dados] of contexto?.antes ?? []) qc.setQueryData(chave, dados)
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: sisKeys.lista('users') })
      await qc.invalidateQueries({ queryKey: administracaoKeys.todos })
    },
  })
}
