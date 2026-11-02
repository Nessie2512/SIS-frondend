import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { contagensSisQuery, type Contagens } from '@/entities/relatorio'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Esqueleto } from '@/shared/ui'

const classesTabela = 'w-full text-left text-corpo'
const classesCabecalho = 'px-4 py-2.5 font-medium'

/**
 * Backend SIS: os relatórios são contagens do ano lectivo (estudantes por sexo, por ciclo e
 * por turma; professores). Não há ficheiros a gerar: os números aparecem logo.
 */
export function ContagensAno({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const { data, isPending, error } = useQuery(contagensSisQuery(anoLectivoId))
  if (isPending) return <Esqueleto className="h-72 w-full" />
  if (error) return <Aviso tom="erro">{mensagemDeErro(error)}</Aviso>
  return (
    <div className="flex flex-col gap-8">
      <Resumo contagens={data} />
      <section aria-labelledby="por-ciclo" className="flex flex-col gap-3">
        <h2 id="por-ciclo" className="text-titulo-seccao">
          <Trans>Estudantes por ciclo</Trans>
        </h2>
        <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
          <table className={classesTabela}>
            <caption className="sr-only">{t`Estudantes por ciclo e sexo`}</caption>
            <thead className="text-legenda text-texto-2">
              <tr className="border-b border-linha">
                <th scope="col" className={classesCabecalho}>
                  <Trans>Ciclo</Trans>
                </th>
                <th scope="col" className={`${classesCabecalho} text-right`}>
                  <Trans>Rapazes</Trans>
                </th>
                <th scope="col" className={`${classesCabecalho} text-right`}>
                  <Trans>Raparigas</Trans>
                </th>
                <th scope="col" className={`${classesCabecalho} text-right`}>
                  <Trans>Total</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.porCiclo.map((c) => (
                <tr key={c.cicloId} className="h-linha border-b border-linha last:border-0">
                  <th scope="row" className="px-4 text-left font-medium">
                    {c.ciclo}
                  </th>
                  <td className="tabular px-4 text-right">{c.rapazes}</td>
                  <td className="tabular px-4 text-right">{c.raparigas}</td>
                  <td className="tabular px-4 text-right font-medium">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="por-turma" className="flex flex-col gap-3">
        <h2 id="por-turma" className="text-titulo-seccao">
          <Trans>Estudantes por turma</Trans>
        </h2>
        {data.porTurma.length === 0 ? (
          <p className="text-texto-2">
            <Trans>Ainda não há turmas activas neste ano lectivo.</Trans>
          </p>
        ) : (
          <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
            <table className={classesTabela}>
              <caption className="sr-only">{t`Estudantes por turma`}</caption>
              <thead className="text-legenda text-texto-2">
                <tr className="border-b border-linha">
                  <th scope="col" className={classesCabecalho}>
                    <Trans>Turma</Trans>
                  </th>
                  <th scope="col" className={classesCabecalho}>
                    <Trans>Classe</Trans>
                  </th>
                  <th scope="col" className={`${classesCabecalho} text-right`}>
                    <Trans>Estudantes</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.porTurma.map((x) => (
                  <tr key={x.turmaId} className="h-linha border-b border-linha last:border-0">
                    <th scope="row" className="px-4 text-left font-medium">
                      {x.turma}
                    </th>
                    <td className="px-4 text-texto-2">{x.classe}</td>
                    <td className="tabular px-4 text-right">{x.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Resumo({ contagens: c }: { contagens: Contagens }) {
  const { t } = useLingui()
  const itens = [
    { rotulo: t`Estudantes`, valor: c.total },
    { rotulo: t`Rapazes`, valor: c.rapazes },
    { rotulo: t`Raparigas`, valor: c.raparigas },
    { rotulo: t`Professores`, valor: c.professores },
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className="rounded-cartao bg-superficie p-4 ring-1 ring-linha">
          <dt className="text-secundario text-texto-2">{i.rotulo}</dt>
          <dd className="tabular text-titulo-pagina">{i.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
