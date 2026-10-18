import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { inscritosQuery, turmaQuery } from '@/entities/turma'
import { meQuery } from '@/entities/utilizador'
import { formatarInstante } from '@/shared/lib/datas'
import { CabecalhoImpressao, ErroDeRota, Esqueleto, PreVisualizacaoImpressao } from '@/shared/ui'

export const Route = createFileRoute('/_app/imprimir/turma/$turmaId')({
  loader: ({ context: { queryClient }, params: { turmaId } }) =>
    Promise.all([
      queryClient.ensureQueryData(turmaQuery(turmaId)),
      queryClient.ensureQueryData(inscritosQuery(turmaId)),
    ]),
  errorComponent: ErroDeRota,
  component: ListaNominal,
})

/** Lista nominal da turma para imprimir (guia 7.6): ordem alfabética, cabeçalho repetido. */
function ListaNominal() {
  const { t } = useLingui()
  const { turmaId } = Route.useParams()
  const { anoLectivoId } = Route.useRouteContext()
  const { data: turma } = useQuery(turmaQuery(turmaId))
  const { data: inscritos } = useQuery(inscritosQuery(turmaId))
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const { data: eu } = useQuery(meQuery())
  if (!turma || !inscritos) return <Esqueleto className="h-[60vh] w-full" />

  const designacao = turma.designacao
  const sala = turma.sala
  const ano = anos.find((a) => a.id === anoLectivoId)?.designacao ?? ''
  const lista = [...inscritos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  const total = lista.length
  const emitida = formatarInstante(new Date())
  const autor = eu?.nome ?? ''

  return (
    <PreVisualizacaoImpressao
      titulo={t`Lista nominal — ${designacao}`}
      voltar={
        <Link
          to="/turmas"
          search={{ turma: turma.id }}
          className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
        >
          <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Turmas</Trans>
        </Link>
      }
    >
      <CabecalhoImpressao
        titulo={t`Lista nominal da turma ${designacao}`}
        subtitulo={[turma.classe, turma.turnoRotulo, sala].filter(Boolean).join(' · ')}
        referencia={
          <>
            <p>{t`Ano lectivo ${ano}`}</p>
            <p className="tabular">
              {plural(total, { one: '# estudante', other: '# estudantes' })}
            </p>
          </>
        }
      />
      {total === 0 ? (
        <p className="text-texto-2">
          <Trans>Ainda não há estudantes inscritos nesta turma.</Trans>
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t`Estudantes da turma ${designacao}`}</caption>
          <thead>
            <tr className="border-b border-texto-1 text-legenda text-texto-2">
              <th scope="col" className="w-10 py-1.5 pr-2 text-right font-medium">
                <Trans>N.º</Trans>
              </th>
              <th scope="col" className="w-28 px-2 py-1.5 font-medium">
                <Trans>Processo</Trans>
              </th>
              <th scope="col" className="px-2 py-1.5 font-medium">
                <Trans>Nome</Trans>
              </th>
              <th scope="col" className="w-[35%] px-2 py-1.5 font-medium">
                <Trans>Observações</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e, i) => (
              <tr key={e.matriculaId} className="border-b border-linha">
                <td className="tabular py-1.5 pr-2 text-right">{i + 1}</td>
                <td className="tabular px-2 py-1.5">{e.numeroProcesso}</td>
                <td className="px-2 py-1.5">{e.nome}</td>
                <td className="px-2 py-1.5" />
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <footer className="mt-auto flex justify-between gap-6 border-t border-linha pt-3 text-secundario text-texto-3">
        <span>{t`Emitida em ${emitida} por ${autor}`}</span>
        <span>
          <Trans>Assinatura: ____________________________</Trans>
        </span>
      </footer>
    </PreVisualizacaoImpressao>
  )
}
