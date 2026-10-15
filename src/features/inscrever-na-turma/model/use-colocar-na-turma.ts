import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys } from '@/entities/estudante'
import { matriculaKeys } from '@/entities/matricula'
import { turmaKeys, type Inscrito } from '@/entities/turma'
import { api, eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { notificar, notificarComDesfazer } from '@/shared/ui'
import { moverCartao, quadroKeys, SEM_TURMA, type Quadro } from './quadro'

export interface Colocacao {
  cartao: Inscrito
  origem: string
  destino: string
  /** Obrigatório ao mudar de turma (guia 2.3) */
  motivo?: string
  /** Excepção de lotação, para quem tem permissão (guia 2.4) */
  excepcao?: string
  /** Não oferecer Desfazer (a própria acção já é um desfazer) */
  semDesfazer?: boolean
}

/**
 * Inscrever, mover ou retirar de uma turma (guia 5.1, 5.2): optimista. O cartão assenta já na
 * turma de destino e a ocupação actualiza; se o servidor recusar, volta ao sítio e explica.
 * Mutações da mesma classe correm em série, para a ordem dos gestos ser a ordem no servidor.
 */
export function useColocarNaTurma(
  anoLectivoId: string,
  classeId: string,
  aoRecusarPorLotacao?: (c: Colocacao) => void,
) {
  const qc = useQueryClient()
  const chave = quadroKeys.classe(anoLectivoId, classeId)

  const mutacao = useMutation({
    mutationKey: ['colocar-na-turma'],
    scope: { id: `quadro:${classeId}` },
    mutationFn: async ({ cartao, origem, destino, motivo, excepcao }: Colocacao) => {
      const matriculaId = cartao.matriculaId
      if (destino === SEM_TURMA) {
        await api.DELETE('/inscricoes/{matriculaId}', { params: { path: { matriculaId } } })
      } else if (origem === SEM_TURMA) {
        await api.POST('/turmas/{id}/inscricoes', {
          params: { path: { id: destino } },
          body: { matriculaId, excepcaoJustificacao: excepcao },
        })
      } else {
        await api.POST('/inscricoes/{matriculaId}/mover', {
          params: { path: { matriculaId } },
          body: { turmaDestinoId: destino, motivo: motivo ?? '', excepcaoJustificacao: excepcao },
        })
      }
    },
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Quadro>(chave)
      if (antes)
        qc.setQueryData<Quadro>(
          chave,
          moverCartao(antes, c.cartao.matriculaId, c.origem, c.destino),
        )
      anunciar.educado(frase(antes, c))
      return { antes }
    },
    onError: (erro, c, contexto) => {
      if (contexto?.antes) qc.setQueryData(chave, contexto.antes)
      const mensagem = mensagemDeErro(erro)
      anunciar.assertivo(mensagem)
      if (eApiError(erro) && erro.temCodigo('LOTACAO_ESGOTADA') && aoRecusarPorLotacao) {
        aoRecusarPorLotacao(c)
      } else {
        notificar.erro(mensagem)
      }
    },
    onSuccess: (_r, c) => {
      if (c.semDesfazer) return
      const antes = qc.getQueryData<Quadro>(chave)
      notificarComDesfazer(frase(antes, c), () =>
        mutacao.mutate({
          cartao: { ...c.cartao, turmaId: c.destino === SEM_TURMA ? null : c.destino },
          origem: c.destino,
          destino: c.origem,
          motivo: i18n._(msg`Desfeito pelo utilizador`),
          semDesfazer: true,
        }),
      )
    },
    // A cache optimista é uma previsão; o servidor tem a última palavra (guia 5.5)
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: chave }),
        qc.invalidateQueries({ queryKey: turmaKeys.todas }),
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: estudanteKeys.todos, refetchType: 'none' }),
      ]),
  })

  return mutacao
}

function frase(quadro: Quadro | undefined, c: Colocacao) {
  const nome = c.cartao.nome
  const turma = quadro?.turmas.find((t) => t.id === c.destino)?.designacao ?? ''
  if (c.destino === SEM_TURMA) return i18n._(msg`${nome} retirado da turma.`)
  return i18n._(msg`${nome} colocado na ${turma}.`)
}
