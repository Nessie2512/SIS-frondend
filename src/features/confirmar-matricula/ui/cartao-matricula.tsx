import { Trans, useLingui } from '@lingui/react/macro'
import { CircleCheck } from 'lucide-react'
import type { DocumentoEstudante, Estudante } from '@/entities/estudante'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { useCan } from '@/shared/lib/permissoes'
import { Button, Dica, EtiquetaEstado, notificar } from '@/shared/ui'
import { useConfirmarMatricula } from '../model/use-confirmar-matricula'
import { AnularMatricula } from './anular-matricula'

interface Props {
  estudante: Estudante
  documentos: DocumentoEstudante[]
  soLeitura: boolean
}

/**
 * Matrícula do ano em contexto com a lista de verificação (guia 2.4): o botão Confirmar
 * só fica activo com os documentos obrigatórios todos entregues; até lá diz o que falta.
 */
export function CartaoMatricula({ estudante, documentos, soLeitura }: Props) {
  const { t } = useLingui()
  const podeEscrever = useCan('matriculas:escrever')
  const confirmar = useConfirmarMatricula()
  if (!estudante.matriculaId || !estudante.matricula) return null

  const obrigatorios = documentos.filter((d) => d.obrigatorio)
  const entregues = obrigatorios.filter((d) => d.entregue).length
  const total = obrigatorios.length
  const emFalta = total - entregues
  const completa = emFalta === 0
  const matricula = estudante.matricula
  const nome = estudante.nome
  const id = estudante.matriculaId

  const razao = soLeitura
    ? t`O ano lectivo está encerrado.`
    : !completa
      ? emFalta === 1
        ? t`Falta 1 documento obrigatório.`
        : t`Faltam ${emFalta} documentos obrigatórios.`
      : undefined

  return (
    <section
      aria-labelledby="matricula-titulo"
      className="flex flex-wrap items-center gap-4 rounded-cartao bg-superficie p-4 ring-1 ring-linha"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="matricula-titulo" className="flex flex-wrap items-center gap-2 text-subtitulo">
          <Trans>Matrícula</Trans>
          {estudante.matriculaPendente ? (
            <EtiquetaEstado tom="accao">{t`A confirmar`}</EtiquetaEstado>
          ) : (
            <EtiquetaEstado tom="sucesso">{t`Confirmada`}</EtiquetaEstado>
          )}
        </h2>
        <p className="text-secundario text-texto-2">{matricula}</p>
        {estudante.matriculaPendente && (
          <p className="tabular text-secundario text-texto-2">
            {t`Documentos obrigatórios: ${entregues} de ${total} entregues`}
          </p>
        )}
      </div>
      {podeEscrever && !soLeitura && <AnularMatricula estudante={estudante} />}
      {estudante.matriculaPendente &&
        podeEscrever &&
        (razao ? (
          <>
            <Dica texto={razao}>
              {/* Desactivado com a razão; continua focável para a dica (guia 2.7) */}
              <Button
                aria-disabled="true"
                aria-describedby="razao-confirmar"
                className="opacity-50"
              >
                <Trans>Confirmar matrícula</Trans>
              </Button>
            </Dica>
            <span id="razao-confirmar" className="sr-only">
              {razao}
            </span>
          </>
        ) : (
          <Button
            variante="primario"
            aCarregar={confirmar.isPending}
            onClick={() =>
              confirmar.mutate(id, {
                onSuccess: () => {
                  notificar.sucesso(t`Matrícula de ${nome} confirmada.`)
                  anunciar.educado(t`Matrícula de ${nome} confirmada.`)
                },
                onError: (erro) => notificar.erro(mensagemDeErro(erro)),
              })
            }
          >
            <CircleCheck aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Confirmar matrícula</Trans>
          </Button>
        ))}
    </section>
  )
}
