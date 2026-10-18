import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys, type DocumentoEstudante, type Estudante } from '@/entities/estudante'
import { api } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { notificarErroDeDominio } from '@/shared/lib/erros-dominio'

interface Variaveis {
  documento: DocumentoEstudante
  entregue: boolean
}

/**
 * Marcar documento como entregue (guia 5.1): optimista. O visto aparece já e o contador
 * de documentos em falta actualiza; se falhar, reverte e explica.
 */
export function useMarcarDocumento(estudanteId: string) {
  const qc = useQueryClient()
  const chaveDocs = estudanteKeys.documentos(estudanteId)
  const chaveEstudante = estudanteKeys.detalhe(estudanteId)

  return useMutation({
    mutationKey: ['marcar-documento'],
    meta: { reversao: msg`O documento voltou ao estado anterior.` },
    scope: { id: `estudante:${estudanteId}:documentos` },
    mutationFn: async ({ documento, entregue }: Variaveis) => {
      const estado = entregue ? 'ENTREGUE' : documento.obrigatorio ? 'EM_FALTA' : 'DISPENSADO'
      await api.PATCH('/estudantes/{id}/documentos/{documentoId}', {
        params: { path: { id: estudanteId, documentoId: documento.id } },
        body: { estado },
      })
    },
    onMutate: async ({ documento, entregue }) => {
      await qc.cancelQueries({ queryKey: chaveDocs })
      const antesDocs = qc.getQueryData<DocumentoEstudante[]>(chaveDocs)
      const antesEstudante = qc.getQueryData<Estudante>(chaveEstudante)
      qc.setQueryData<DocumentoEstudante[]>(chaveDocs, (docs) =>
        docs?.map((d) =>
          d.id === documento.id
            ? {
                ...d,
                entregue,
                estado: entregue ? 'ENTREGUE' : d.obrigatorio ? 'EM_FALTA' : 'DISPENSADO',
              }
            : d,
        ),
      )
      if (antesEstudante && documento.obrigatorio) {
        const delta = entregue ? -1 : 1
        qc.setQueryData<Estudante>(chaveEstudante, {
          ...antesEstudante,
          documentosEmFalta: Math.max(0, antesEstudante.documentosEmFalta + delta),
        })
      }
      const designacao = documento.designacao
      anunciar.educado(
        entregue ? i18n._(msg`${designacao}: entregue.`) : i18n._(msg`${designacao}: em falta.`),
      )
      return { antesDocs, antesEstudante }
    },
    onError: (erro, _v, contexto) => {
      if (contexto?.antesDocs) qc.setQueryData(chaveDocs, contexto.antesDocs)
      if (contexto?.antesEstudante) qc.setQueryData(chaveEstudante, contexto.antesEstudante)
      notificarErroDeDominio(erro) // o anúncio assertivo vem da cache de mutações
    },
    // A cache optimista é uma previsão; o servidor tem a última palavra (guia 5.5)
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chaveDocs })
      void qc.invalidateQueries({ queryKey: chaveEstudante })
    },
  })
}
