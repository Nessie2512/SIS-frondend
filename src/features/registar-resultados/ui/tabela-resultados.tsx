import { Trans, useLingui } from '@lingui/react/macro'
import { CheckCheck } from 'lucide-react'
import { useState } from 'react'
import type { ResultadoFinal } from '@/entities/turma'
import type { components } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  AvisoAoSair,
  BarraProgresso,
  Button,
  ControloSegmentado,
  EstadoVazio,
  notificar,
} from '@/shared/ui'
import { useRegistarResultados } from '../model/use-registar-resultados'

type Resultado = components['schemas']['ResultadoFinal']

interface Props {
  turmaId: string
  designacao: string
  linhas: ResultadoFinal[]
  soLeitura: boolean
}

/**
 * Resultados finais da turma (guia 2.3): aprovado ou reprovado por estudante, guardados de uma
 * vez. Decidem o encerramento do ano e quem sobe de classe na renovação.
 */
export function TabelaResultados({ turmaId, designacao, linhas, soLeitura }: Props) {
  const { t } = useLingui()
  const registar = useRegistarResultados(turmaId)
  const [alteracoes, setAlteracoes] = useState<Record<string, Resultado>>({})
  const valor = (l: ResultadoFinal) => alteracoes[l.matriculaId] ?? l.resultado
  const registados = linhas.filter((l) => valor(l)).length
  const total = linhas.length
  const porGuardar = Object.keys(alteracoes).length
  const emFalta = total - registados

  if (total === 0) {
    return (
      <EstadoVazio
        titulo={t`Não há estudantes com matrícula confirmada nesta turma.`}
        descricao={t`Os resultados registam-se para as matrículas confirmadas.`}
      />
    )
  }

  function marcarEmFaltaComoAprovados() {
    setAlteracoes((a) => {
      const novo = { ...a }
      for (const l of linhas) if (!valor(l)) novo[l.matriculaId] = 'APROVADO'
      return novo
    })
  }

  function guardar() {
    registar.mutate(
      Object.entries(alteracoes).map(([matriculaId, resultado]) => ({ matriculaId, resultado })),
      {
        onSuccess: () => {
          setAlteracoes({})
          const n = porGuardar
          notificar.sucesso(t`${designacao}: ${n} resultados guardados.`)
          anunciar.educado(t`${n} resultados guardados.`)
        },
        onError: (erro) => notificar.erro(mensagemDeErro(erro)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AvisoAoSair sujo={porGuardar > 0} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <BarraProgresso
            rotulo={t`Resultados registados`}
            valor={Math.round((registados / total) * 100)}
            estado={emFalta === 0 ? 'concluido' : 'determinado'}
          />
          <p className="tabular text-secundario text-texto-2" aria-live="polite">
            {t`${registados} de ${total} registados`}
            {porGuardar > 0 && ` · ${t`${porGuardar} por guardar`}`}
          </p>
        </div>
        {!soLeitura && (
          <div className="flex gap-2">
            {emFalta > 0 && (
              <Button onClick={marcarEmFaltaComoAprovados}>
                <CheckCheck aria-hidden className="size-4 stroke-[1.5]" />
                <Trans>Marcar os {emFalta} em falta como aprovados</Trans>
              </Button>
            )}
            <Button
              variante="primario"
              disabled={porGuardar === 0}
              aCarregar={registar.isPending}
              onClick={guardar}
            >
              <Trans>Guardar resultados</Trans>
            </Button>
          </div>
        )}
      </div>
      {soLeitura && (
        <Aviso tom="leitura">
          <Trans>O ano lectivo está encerrado. Os resultados ficam só para consulta.</Trans>
        </Aviso>
      )}
      <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
        <table className="w-full text-left text-corpo">
          <caption className="sr-only">{t`Resultados finais da turma ${designacao}`}</caption>
          <thead className="text-legenda text-texto-2">
            <tr className="border-b border-linha">
              <th scope="col" className="w-12 px-4 py-2.5 text-right font-medium">
                <Trans>N.º</Trans>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <Trans>Estudante</Trans>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <Trans>Resultado final</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => {
              const nome = l.nome
              const actual = valor(l)
              return (
                <tr key={l.matriculaId} className="h-linha border-b border-linha last:border-0">
                  <td className="tabular px-4 text-right text-texto-2">{i + 1}</td>
                  <td className="px-4">
                    <span className="font-medium">{nome}</span>{' '}
                    <span className="tabular text-secundario text-texto-3">{l.numeroProcesso}</span>
                  </td>
                  <td className="px-4 py-1.5">
                    {soLeitura ? (
                      <span>
                        {actual === 'APROVADO'
                          ? t`Aprovado`
                          : actual === 'REPROVADO'
                            ? t`Reprovado`
                            : t`Por registar`}
                      </span>
                    ) : (
                      <ControloSegmentado
                        rotulo={t`Resultado de ${nome}`}
                        valor={actual ?? ''}
                        aoMudar={(v) =>
                          setAlteracoes((a) => ({ ...a, [l.matriculaId]: v as Resultado }))
                        }
                        opcoes={[
                          { valor: 'APROVADO', rotulo: t`Aprovado` },
                          { valor: 'REPROVADO', rotulo: t`Reprovado` },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
