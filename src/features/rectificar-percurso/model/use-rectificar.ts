import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys, type EventoPercurso } from '@/entities/estudante'
import { api } from '@/shared/api'
import type { DadosRectificacao } from './esquema'

const ROTULO_RECTIFICACAO = msg`Rectificação`

/**
 * Rectificar uma entrada do percurso (guia 2.4): a original nunca muda; a rectificação é uma
 * entrada nova, ligada a ela, com motivo. Semi-optimista: entra quando o servidor confirma.
 */
export function useRectificar(estudanteId: string) {
  const qc = useQueryClient()
  const chave = estudanteKeys.percurso(estudanteId)
  return useMutation({
    mutationKey: ['percurso', 'rectificar'],
    mutationFn: async ({ evento, dados }: { evento: EventoPercurso; dados: DadosRectificacao }) => {
      const { data } = await api.POST('/estudantes/{id}/percurso/{eventoId}/rectificar', {
        params: { path: { id: estudanteId, eventoId: evento.id } },
        body: dados,
      })
      return { ...data!, tipoRotulo: i18n._(ROTULO_RECTIFICACAO) } satisfies EventoPercurso
    },
    onSuccess: (rectificacao) =>
      qc.setQueryData<EventoPercurso[]>(chave, (lista = []) =>
        [rectificacao, ...lista].sort((a, b) => b.data.localeCompare(a.data)),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}
