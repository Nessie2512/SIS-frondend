import { useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarioKeys, paraEvento, type Calendario, type Evento } from '@/entities/calendario'
import { api, type Dto } from '@/shared/api'

/** Criar evento (semi-optimista: entra no calendário quando o servidor confirma). */
export function useCriarEvento(anoLectivoId: string) {
  const qc = useQueryClient()
  const chave = calendarioKeys.doAno(anoLectivoId)
  return useMutation({
    mutationKey: ['eventos', 'criar'],
    mutationFn: async (novo: Dto<'NovoEventoDto'>) => {
      const { data } = await api.POST('/anos-lectivos/{id}/eventos', {
        params: { path: { id: anoLectivoId } },
        body: novo,
      })
      return paraEvento(data!)
    },
    onSuccess: (evento) =>
      qc.setQueryData<Calendario>(chave, (c) =>
        c
          ? {
              ...c,
              eventos: [...c.eventos, evento].sort((a, b) => a.inicio.localeCompare(b.inicio)),
            }
          : c,
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}

/** Apagar evento (optimista, com Desfazer em quem chama); feriados nacionais não se apagam. */
export function useApagarEvento(anoLectivoId: string) {
  const qc = useQueryClient()
  const chave = calendarioKeys.doAno(anoLectivoId)
  return useMutation({
    mutationKey: ['eventos', 'apagar'],
    scope: { id: `calendario:${anoLectivoId}` },
    mutationFn: async (evento: Evento) => {
      await api.DELETE('/eventos/{id}', { params: { path: { id: evento.id } } })
    },
    onMutate: async (evento) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Calendario>(chave)
      qc.setQueryData<Calendario>(chave, (c) =>
        c ? { ...c, eventos: c.eventos.filter((e) => e.id !== evento.id) } : c,
      )
      return { antes }
    },
    onError: (_erro, _evento, contexto) => qc.setQueryData(chave, contexto?.antes),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}
