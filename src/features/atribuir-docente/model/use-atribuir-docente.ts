import { useMutation, useQueryClient } from '@tanstack/react-query'
import { professorKeys } from '@/entities/professor'
import { turmaKeys, type DocenteTurma } from '@/entities/turma'
import { api } from '@/shared/api'

export interface PedidoAtribuicao {
  disciplinaId: string
  professorId: string
  /** Nome, para mostrar já na célula da disciplina */
  professor: string
  desde: string
  motivo?: string
}

/**
 * Atribuir ou substituir o docente de uma disciplina (guia 2.3, 5.1): optimista. O nome entra
 * logo na linha; numa substituição a atribuição anterior passa para o histórico na mesma acção.
 * Se o servidor recusar, a linha volta ao que era.
 */
export function useAtribuirDocente(turmaId: string) {
  const qc = useQueryClient()
  const chave = turmaKeys.docentes(turmaId)
  return useMutation({
    mutationKey: ['turmas', turmaId, 'docentes'],
    scope: { id: `docentes-${turmaId}` },
    mutationFn: async ({ disciplinaId, professorId, desde, motivo }: PedidoAtribuicao) => {
      const { data } = await api.POST('/turmas/{id}/docentes', {
        params: { path: { id: turmaId } },
        body: { disciplinaId, professorId, desde, motivo },
      })
      return data!
    },
    onMutate: async (pedido) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<DocenteTurma[]>(chave)
      qc.setQueryData<DocenteTurma[]>(chave, (linhas) =>
        linhas?.map((l) => {
          if (l.disciplinaId !== pedido.disciplinaId) return l
          const anterior = l.actual
          return {
            ...l,
            actual: {
              atribuicaoId: 'a-guardar',
              professorId: pedido.professorId,
              professor: pedido.professor,
              desde: pedido.desde,
            },
            historico: anterior
              ? [
                  {
                    professor: anterior.professor,
                    desde: anterior.desde,
                    ate: pedido.desde,
                    motivo: pedido.motivo ?? '',
                  },
                  ...l.historico,
                ]
              : l.historico,
          }
        }),
      )
      return { antes }
    },
    onError: (_erro, _pedido, contexto) => {
      if (contexto) qc.setQueryData(chave, contexto.antes)
    },
    onSuccess: (linha) => {
      qc.setQueryData<DocenteTurma[]>(chave, (linhas) =>
        linhas?.map((l) => (l.disciplinaId === linha.disciplinaId ? linha : l)),
      )
    },
    // A carga lectiva dos professores muda com cada atribuição
    onSettled: () => qc.invalidateQueries({ queryKey: professorKeys.todos }),
  })
}
