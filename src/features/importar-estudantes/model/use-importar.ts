import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraTarefa, tarefaKeys, useTarefasAcompanhadas } from '@/entities/tarefa'
import { api } from '@/shared/api'
import type { LinhaValida } from './analisar'

/**
 * Importar (guia 5.1, 5.7): pré-visualização e confirmação no cliente, criação numa tarefa
 * assíncrona acompanhada no quadro de tarefas, com avisos por linha no fim.
 */
export function useImportarEstudantes() {
  const qc = useQueryClient()
  const acompanhar = useTarefasAcompanhadas((e) => e.acompanhar)
  return useMutation({
    mutationKey: ['importacoes', 'estudantes'],
    mutationFn: async (pedido: { anoLectivoId: string; linhas: LinhaValida[]; chave: string }) => {
      const { data } = await api.POST('/importacoes/estudantes', {
        params: { header: { 'Idempotency-Key': pedido.chave } },
        body: {
          anoLectivoId: pedido.anoLectivoId,
          linhas: pedido.linhas.map((l) => ({
            linha: l.linha,
            nome: l.nome,
            sexo: l.sexo,
            dataNascimento: l.dataNascimento,
            documentoIdentificacao: l.documentoIdentificacao,
            classeId: l.classeId,
            encarregado: l.encarregado,
          })),
        },
      })
      return paraTarefa(data!)
    },
    onSuccess: (tarefa) => {
      qc.setQueryData(tarefaKeys.detalhe(tarefa.id), tarefa)
      acompanhar(tarefa.id)
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'tarefas' })
    },
  })
}
