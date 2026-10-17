import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { resultadosQuery, turmaQuery } from '@/entities/turma'
import { TabelaResultados } from '@/features/registar-resultados'
import { TEMPOS } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import { ErroDeRota, Esqueleto } from '@/shared/ui'

export const Route = createFileRoute('/_app/turmas/$turmaId/resultados')({
  loader: ({ context: { queryClient }, params: { turmaId } }) =>
    Promise.all([
      queryClient.ensureQueryData(turmaQuery(turmaId)),
      queryClient.ensureQueryData(resultadosQuery(turmaId)),
    ]),
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraResultados,
})

/** Resultados finais da turma (guia 2.3): o último passo antes de encerrar o ano. */
function EcraResultados() {
  const { t } = useLingui()
  const { turmaId } = Route.useParams()
  const { soLeitura } = Route.useRouteContext()
  const podeRegistar = useCan('matriculas:escrever')
  const { data: turma } = useQuery(turmaQuery(turmaId))
  const { data: linhas } = useQuery(resultadosQuery(turmaId))
  if (!turma || !linhas) return <Esqueleto className="h-96 w-full" />
  const designacao = turma.designacao
  const classe = turma.classe

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          to="/turmas"
          search={{ turma: turma.id }}
          className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
        >
          <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Turmas</Trans>
        </Link>
        <h1 className="text-titulo-pagina">{t`Resultados finais — ${designacao}`}</h1>
        <p className="text-secundario text-texto-2">
          {t`${classe}. Os aprovados passam à classe seguinte na renovação; os reprovados repetem.`}
        </p>
      </div>
      <TabelaResultados
        turmaId={turma.id}
        designacao={designacao}
        linhas={linhas}
        soLeitura={soLeitura || turma.encerrada || !podeRegistar}
      />
    </section>
  )
}
