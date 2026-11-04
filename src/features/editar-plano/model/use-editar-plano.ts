import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  comLinhas,
  paraPlano,
  planoDoSis,
  planoKeys,
  planoQuery,
  type LinhaPlano,
  type Plano,
} from '@/entities/plano'
import { api, eApiError } from '@/shared/api'
import { apiSis, idNumerico, naoDisponivel, referenciaSis, sisKeys } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'
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
 * Backend SIS: o plano é a lista de disciplinas da classe (planoId = uuid da classe).
 * Acrescentar e retirar usam os ids numéricos das disciplinas; não há carga horária.
 */
async function alterarNoSis(
  qc: QueryClient,
  classeId: string,
  alteracao: Alteracao,
): Promise<Plano> {
  if (alteracao.tipo === 'horas') naoDisponivel('CARGA_HORARIA')
  const disciplinas = await qc.fetchQuery(referenciaSis.disciplinas())
  const disciplinaId =
    alteracao.tipo === 'acrescentar' ? alteracao.linha.disciplinaId : alteracao.disciplinaId
  const numero = idNumerico(disciplinas, disciplinaId)
  if (alteracao.tipo === 'acrescentar') {
    const { data } = await apiSis.POST('/grades/{gradeId}/subjects', {
      params: { path: { gradeId: classeId } },
      body: { subjectIds: [numero] },
    })
    if (data?.subjects) return planoDoSis(classeId, data.subjects)
  } else {
    await apiSis.DELETE('/grades/{gradeId}/subjects/{subjectId}', {
      params: { path: { gradeId: classeId, subjectId: numero } },
    })
  }
  // As classes guardam subjectIds (disciplinas em uso): a lista em bruto muda também
  await qc.invalidateQueries({ queryKey: sisKeys.lista('grades') })
  return qc.fetchQuery({ ...planoQuery(classeId), staleTime: 0 })
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
      if (eReal('curriculo')) return alterarNoSis(qc, planoId, alteracao)
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
