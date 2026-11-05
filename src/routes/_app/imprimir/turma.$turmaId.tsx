import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { inscritosQuery, turmaQuery } from '@/entities/turma'
import { formatarTelefone } from '@/shared/lib/formatar'
import { CabecalhoImpressao, ErroDeRota, Esqueleto, PreVisualizacaoImpressao } from '@/shared/ui'
import { exigir } from '../../-acesso'

export const Route = createFileRoute('/_app/imprimir/turma/$turmaId')({
  beforeLoad: () => exigir('listaNominal'),
  loader: ({ context: { queryClient }, params: { turmaId } }) =>
    Promise.all([
      queryClient.ensureQueryData(turmaQuery(turmaId)),
      queryClient.ensureQueryData(inscritosQuery(turmaId)),
    ]),
  errorComponent: ErroDeRota,
  component: ListaNominal,
})

const classeCelula = 'border border-[#bfbfbf] px-2.5 py-2 align-top'

/**
 * Lista nominal da turma para imprimir (guia 7.6), no modelo da secretaria: A4 deitada, papel
 * timbrado, turma e director de turma, e uma tabela com contorno em ordem alfabética.
 */
function ListaNominal() {
  const { t } = useLingui()
  const { turmaId } = Route.useParams()
  const { data: turma } = useQuery(turmaQuery(turmaId))
  const { data: inscritos } = useQuery(inscritosQuery(turmaId))
  if (!turma || !inscritos) return <Esqueleto className="h-[60vh] w-full" />

  const designacao = turma.designacao
  const director = turma.directorTurma?.nome ?? '—'
  const lista = [...inscritos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

  return (
    <PreVisualizacaoImpressao
      titulo={t`Lista nominal — ${designacao}`}
      orientacao="paisagem"
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
      <CabecalhoImpressao titulo={t`Lista de estudantes`} />
      <p className="text-[12pt]">
        <Trans>
          Turma: {designacao} | Director de turma: {director}
        </Trans>
      </p>
      {lista.length === 0 ? (
        <p className="text-texto-2">
          <Trans>Ainda não há estudantes inscritos nesta turma.</Trans>
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-[9.5pt]">
          <caption className="sr-only">{t`Estudantes da turma ${designacao}`}</caption>
          <thead>
            <tr className="font-bold">
              <th scope="col" className={`${classeCelula} w-14`}>
                <Trans>N.º</Trans>
              </th>
              <th scope="col" className={classeCelula}>
                <Trans>Nome</Trans>
              </th>
              <th scope="col" className={`${classeCelula} w-36`}>
                <Trans>Código de estudante</Trans>
              </th>
              <th scope="col" className={`${classeCelula} w-36`}>
                <Trans>Idioma preferencial</Trans>
              </th>
              <th scope="col" className={`${classeCelula} w-40`}>
                <Trans>Contactos dos pais</Trans>
              </th>
              <th scope="col" className={`${classeCelula} w-32`}>
                <Trans>Nacionalidade</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e, i) => (
              <tr key={e.matriculaId}>
                <td className={`${classeCelula} tabular font-bold`}>{i + 1}</td>
                <td className={classeCelula}>{e.nome}</td>
                <td className={`${classeCelula} tabular`}>{e.numeroProcesso || '—'}</td>
                <td className={classeCelula}>{e.idioma || '—'}</td>
                <td className={`${classeCelula} tabular`}>
                  {e.contactos?.length
                    ? e.contactos.map((c) => <p key={c}>{formatarTelefone(c)}</p>)
                    : '—'}
                </td>
                <td className={classeCelula}>{e.nacionalidade || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PreVisualizacaoImpressao>
  )
}
