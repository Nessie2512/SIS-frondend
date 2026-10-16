import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { comLinhas, paraPlano, planoKeys, type LinhaPlano, type Plano } from '@/entities/plano'
import { api, eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { notificar, notificarComDesfazer } from '@/shared/ui'

type Alteracao =
  | { tipo: 'horas'; disciplinaId: string; horasSemanais: number }
  | { tipo: 'acrescentar'; linha: LinhaPlano }
  | { tipo: 'retirar'; disciplinaId: string }

function aplicar(plano: Plano, alteracao: Alteracao): Plano {
  switch (alteracao.tipo) {
    case 'horas':
      return comLinhas(
        plano,
        plano.linhas.map((l) =>
          l.disciplinaId === alteracao.disciplinaId
            ? { ...l, horasSemanais: alteracao.horasSemanais }
            : l,
        ),
      )
    case 'acrescentar':
      return comLinhas(plano, [...plano.linhas, alteracao.linha])
    case 'retirar':
      return comLinhas(
        plano,
        plano.linhas.filter((l) => l.disciplinaId !== alteracao.disciplinaId),
      )
  }
}

/**
 * Edição do rascunho do plano (guia 5.1, 5.2, 5.5): cada alteração aparece logo, corre em
 * série com If-Match da última versão conhecida; 412 mostra a versão actual do servidor.
 */
export function useEditarPlano(planoId: string) {
  const qc = useQueryClient()
  const chave = planoKeys.detalhe(planoId)

  const mutacao = useMutation({
    mutationKey: ['editar-plano'],
    scope: { id: `plano:${planoId}` },
    mutationFn: async (alteracao: Alteracao) => {
      // Em série: a revisão é sempre a que o servidor devolveu na alteração anterior
      const revisao = qc.getQueryData<Plano>(chave)?.revisao ?? ''
      const header = { 'If-Match': revisao }
      const id = planoId
      const { data } =
        alteracao.tipo === 'horas'
          ? await api.PATCH('/planos/{id}/linhas/{disciplinaId}', {
              params: { path: { id, disciplinaId: alteracao.disciplinaId }, header },
              body: { horasSemanais: alteracao.horasSemanais },
            })
          : alteracao.tipo === 'acrescentar'
            ? await api.POST('/planos/{id}/linhas', {
                params: { path: { id }, header },
                body: {
                  disciplinaId: alteracao.linha.disciplinaId,
                  horasSemanais: alteracao.linha.horasSemanais,
                },
              })
            : await api.DELETE('/planos/{id}/linhas/{disciplinaId}', {
                params: { path: { id, disciplinaId: alteracao.disciplinaId }, header },
              })
      return paraPlano(data!)
    },
    onMutate: async (alteracao) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Plano>(chave)
      if (antes) qc.setQueryData<Plano>(chave, aplicar(antes, alteracao))
      return { antes }
    },
    onError: async (erro, _alteracao, contexto) => {
      if (contexto?.antes) qc.setQueryData(chave, contexto.antes)
      if (eApiError(erro) && erro.temCodigo('VERSAO_DESACTUALIZADA')) {
        await qc.refetchQueries({ queryKey: chave })
      }
    },
    onSuccess: (plano) => qc.setQueryData(chave, plano),
    onSettled: () => qc.invalidateQueries({ queryKey: planoKeys.todos, refetchType: 'none' }),
  })

  /** Para o EdicaoNoSitio: rejeita com a mensagem a mostrar junto do campo. */
  async function alterarHoras(disciplinaId: string, horasSemanais: number) {
    try {
      await mutacao.mutateAsync({ tipo: 'horas', disciplinaId, horasSemanais })
      anunciar.educado(i18n._(msg`Alteração guardada.`))
    } catch (erro) {
      const doCampo = eApiError(erro)
        ? erro.errors.find((e) => e.campo === 'horasSemanais')?.mensagem
        : undefined
      throw new Error(doCampo ?? mensagemDeErro(erro), { cause: erro })
    }
  }

  function acrescentar(linha: LinhaPlano) {
    mutacao.mutate(
      { tipo: 'acrescentar', linha },
      {
        onSuccess: () => {
          const nome = linha.disciplina
          anunciar.educado(i18n._(msg`${nome} acrescentada ao plano.`))
        },
        onError: (erro) => notificar.erro(mensagemDeErro(erro)),
      },
    )
  }

  /** Retirar é reversível: sai logo e oferece Desfazer (guia 5.4). */
  function retirar(linha: LinhaPlano) {
    const nome = linha.disciplina
    mutacao.mutate(
      { tipo: 'retirar', disciplinaId: linha.disciplinaId },
      { onError: (erro) => notificar.erro(mensagemDeErro(erro)) },
    )
    notificarComDesfazer(i18n._(msg`${nome} retirada do plano.`), () => acrescentar(linha))
  }

  return { alterarHoras, acrescentar, retirar }
}
