import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { DocumentoEstudante } from '@/entities/estudante'
import { cn } from '@/shared/lib/cn'
import { useCan } from '@/shared/lib/permissoes'
import { EtiquetaEstado } from '@/shared/ui'
import { useMarcarDocumento } from '../model/use-marcar-documento'

interface Props {
  estudanteId: string
  documentos: DocumentoEstudante[]
  soLeitura: boolean
}

/** Lista de verificação dos documentos (guia 2.4, 5.1): alimenta o indicador de processo incompleto. */
export function ListaDocumentos({ estudanteId, documentos, soLeitura }: Props) {
  const { t } = useLingui()
  const podeEscrever = useCan('estudantes:escrever')
  const marcar = useMarcarDocumento(estudanteId)
  const emFalta = documentos.filter((d) => d.obrigatorio && !d.entregue).length

  return (
    <section aria-labelledby="documentos-titulo" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="documentos-titulo" className="text-titulo-seccao">
          <Trans>Documentos do estudante</Trans>
        </h2>
        {emFalta > 0 ? (
          <EtiquetaEstado tom="aviso">
            {plural(emFalta, { one: '# obrigatório em falta', other: '# obrigatórios em falta' })}
          </EtiquetaEstado>
        ) : (
          <EtiquetaEstado tom="sucesso">{t`Processo completo`}</EtiquetaEstado>
        )}
      </div>
      <ul className="divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha">
        {documentos.map((documento) => {
          const id = `doc-${documento.id}`
          const bloqueado = !podeEscrever || soLeitura
          return (
            <li key={documento.id} className="flex h-linha items-center gap-3 px-4">
              <input
                id={id}
                type="checkbox"
                checked={documento.entregue}
                disabled={bloqueado}
                onChange={(e) => marcar.mutate({ documento, entregue: e.target.checked })}
                className="size-4 accent-(--color-acento)"
              />
              <label
                htmlFor={id}
                className={cn('flex-1', bloqueado ? 'cursor-default' : 'cursor-pointer')}
              >
                {documento.designacao}
                {!documento.obrigatorio && (
                  <span className="ml-2 text-secundario text-texto-3">
                    <Trans>opcional</Trans>
                  </span>
                )}
              </label>
              <span className="text-secundario text-texto-2">
                {documento.entregue ? (
                  <Trans>Entregue</Trans>
                ) : documento.obrigatorio ? (
                  <span className="text-aviso">
                    <Trans>Em falta</Trans>
                  </span>
                ) : (
                  <Trans>Dispensado</Trans>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {soLeitura && (
        <p className="text-secundario text-texto-3">
          <Trans>O ano lectivo está encerrado. Só é possível consultar.</Trans>
        </p>
      )}
    </section>
  )
}
