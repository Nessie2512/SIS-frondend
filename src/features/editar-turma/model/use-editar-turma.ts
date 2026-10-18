import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { paraTurma, turmaKeys, turmaQuery, type Turma } from '@/entities/turma'
import { api, eApiError, type Dto } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'

export type CampoTurma = 'sala' | 'directorTurmaId'

export interface ConflitoTurma {
  campo: CampoTurma
  meu: string
  /** Valor actual no servidor, já pronto a mostrar */
  actual: string | null
}

/**
 * Edição no sítio da turma (guia 5.1, 5.5): optimista com controlo de versão. 422 volta ao campo
 * com a mensagem (sala ocupada no turno, professor que já dirige outra turma); 412 mostra o
 * valor actual do servidor e deixa escolher qual manter.
 */
export function useEditarTurma(turmaId: string) {
  const qc = useQueryClient()
  const chave = turmaKeys.detalhe(turmaId)
  const [conflito, setConflito] = useState<ConflitoTurma | null>(null)

  const mutacao = useMutation({
    mutationKey: ['editar-turma'],
    scope: { id: `turma:${turmaId}` },
    mutationFn: async (alteracao: Dto<'TurmaAlteracaoDto'> & { nomeDirector?: string }) => {
      const { nomeDirector: _, ...corpo } = alteracao
      const { data } = await api.PATCH('/turmas/{id}', {
        params: { path: { id: turmaId }, header: {} },
        body: corpo,
      })
      return paraTurma(data!)
    },
    onMutate: async (alteracao) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Turma>(chave)
      if (antes) {
        const provisoria: Turma = { ...antes }
        if (alteracao.sala !== undefined) provisoria.sala = alteracao.sala
        if (alteracao.directorTurmaId !== undefined) {
          provisoria.directorTurma = alteracao.directorTurmaId
            ? { professorId: alteracao.directorTurmaId, nome: alteracao.nomeDirector ?? '' }
            : null
        }
        qc.setQueryData<Turma>(chave, provisoria)
      }
      return { antes }
    },
    onError: (_erro, _alteracao, contexto) => {
      if (contexto?.antes) qc.setQueryData(chave, contexto.antes)
    },
    onSuccess: (actualizada) => {
      qc.setQueryData(chave, actualizada)
      anunciar.educado(i18n._(msg`Alteração guardada.`))
    },
    // A lista mostra a sala: marca-a como desactualizada sem a pedir já
    onSettled: () => qc.invalidateQueries({ queryKey: turmaKeys.todas, refetchType: 'none' }),
  })

  /** Para o EdicaoNoSitio: resolve se guardou; rejeita com a mensagem a mostrar no campo. */
  async function guardar(campo: CampoTurma, valor: string, nomeDirector?: string) {
    try {
      await mutacao.mutateAsync({ [campo]: valor || null, nomeDirector })
    } catch (erro) {
      if (eApiError(erro) && erro.temCodigo('VERSAO_DESACTUALIZADA')) {
        const actual = await qc.fetchQuery({ ...turmaQuery(turmaId), staleTime: 0 })
        setConflito({
          campo,
          meu: valor,
          actual: campo === 'sala' ? actual.sala : (actual.directorTurma?.nome ?? null),
        })
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
    manterActual: () => setConflito(null),
    guardarOMeu: async (nomeDirector?: string) => {
      if (!conflito) return
      setConflito(null)
      await guardar(conflito.campo, conflito.meu, nomeDirector)
    },
  }
}
