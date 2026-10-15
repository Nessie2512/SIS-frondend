import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { estudanteKeys, estudanteQuery, paraEstudante, type Estudante } from '@/entities/estudante'
import { api, eApiError, type Dto } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'

export type CampoEditavel = 'nome' | 'telefone' | 'morada'

export interface Conflito {
  campo: CampoEditavel
  meu: string
  actual: string | null
}

/**
 * Edição no sítio optimista com controlo de versão (guia 5.1, 5.5):
 * o valor muda logo; 422 volta ao campo com a mensagem; 412 mostra o valor actual
 * do servidor e deixa escolher qual manter.
 */
export function useEditarEstudante(estudanteId: string) {
  const qc = useQueryClient()
  const chave = estudanteKeys.detalhe(estudanteId)
  const [conflito, setConflito] = useState<Conflito | null>(null)

  const mutacao = useMutation({
    mutationKey: ['editar-estudante'],
    scope: { id: `estudante:${estudanteId}` }, // mutações do mesmo estudante correm em série
    mutationFn: async (alteracao: Dto<'EstudanteAlteracaoDto'>) => {
      const { data } = await api.PATCH('/estudantes/{id}', {
        params: { path: { id: estudanteId }, header: {} },
        body: alteracao,
      })
      return paraEstudante(data!)
    },
    onMutate: async (alteracao) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Estudante>(chave)
      if (antes) qc.setQueryData<Estudante>(chave, { ...antes, ...alteracao })
      return { antes }
    },
    onError: (_erro, _alteracao, contexto) => {
      if (contexto?.antes) qc.setQueryData(chave, contexto.antes)
    },
    onSuccess: (actualizado) => {
      qc.setQueryData(chave, actualizado)
      anunciar.educado(i18n._(msg`Alteração guardada.`))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: estudanteKeys.todos, refetchType: 'none' }),
  })

  /** Para o EdicaoNoSitio: resolve se guardou; rejeita com a mensagem a mostrar no campo. */
  async function guardar(campo: CampoEditavel, valor: string) {
    try {
      await mutacao.mutateAsync({ [campo]: valor || null })
    } catch (erro) {
      if (eApiError(erro) && erro.temCodigo('VERSAO_DESACTUALIZADA')) {
        // Busca a versão actual (e o novo ETag) e pergunta qual manter
        const actual = await qc.fetchQuery({ ...estudanteQuery(estudanteId), staleTime: 0 })
        setConflito({ campo, meu: valor, actual: actual[campo] })
        return
      }
      const deCampo = eApiError(erro)
        ? erro.errors.find((e) => e.campo === campo)?.mensagem
        : undefined
      throw new Error(deCampo ?? mensagemDeErro(erro), { cause: erro })
    }
  }

  return {
    guardar,
    conflito,
    /** Mantém o valor que está no servidor */
    manterActual: () => setConflito(null),
    /** Volta a guardar o meu valor, agora sobre a versão actual */
    guardarOMeu: async () => {
      if (!conflito) return
      setConflito(null)
      await guardar(conflito.campo, conflito.meu)
    },
  }
}
