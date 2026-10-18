import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import * as z from 'zod/mini'
import { classesQuery } from '@/entities/classe'
import { DistribuirAutomaticamente } from '@/features/distribuir-turmas'
import { QuadroTurmas } from '@/features/inscrever-na-turma'
import { quadroQuery } from '@/features/inscrever-na-turma/model/quadro'
import { TEMPOS } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import { Aviso, Campo, ErroDeRota, Esqueleto, Selector } from '@/shared/ui'

export const Route = createFileRoute('/_app/turmas/quadro')({
  validateSearch: z.object({ classeId: z.catch(z._default(z.string(), 'c7'), 'c7') }),
  loaderDeps: ({ search: { classeId } }) => ({ classeId }),
  loader: ({ context: { queryClient, anoLectivoId }, deps: { classeId } }) =>
    Promise.all([
      queryClient.ensureQueryData(classesQuery()),
      anoLectivoId ? queryClient.ensureQueryData(quadroQuery(anoLectivoId, classeId)) : null,
    ]),
  pendingComponent: () => <Esqueleto className="h-[28rem] w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraQuadro,
})

/** Distribuição por turmas (guia 2.3): quadro com arrastar e largar, ocupação visível e Desfazer. */
function EcraQuadro() {
  const { t } = useLingui()
  const { anoLectivoId, soLeitura } = Route.useRouteContext()
  const { classeId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: classes = [] } = useQuery(classesQuery())
  const podeDistribuir = useCan('turmas:escrever')

  return (
    <section className="flex flex-col gap-6">
      <Link
        to="/turmas"
        className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
      >
        <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Turmas</Trans>
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Distribuição por turmas</Trans>
          </h1>
          <p className="text-secundario text-texto-2">
            <Trans>
              Arraste os estudantes entre turmas, ou use o menu de cada cartão. Mudar de turma pede
              o motivo.
            </Trans>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {anoLectivoId && !soLeitura && podeDistribuir && (
            <DistribuirAutomaticamente
              anoLectivoId={anoLectivoId}
              classeId={classeId}
              classe={classes.find((c) => c.id === classeId)?.designacao ?? ''}
            />
          )}
          <Campo rotulo={t`Classe`} className="w-56">
            {(c) => (
              <Selector
                {...c}
                opcoes={classes.map((x) => ({ valor: x.id, rotulo: x.designacao }))}
                valor={classeId}
                aoMudar={(novo) => novo && void navigate({ search: { classeId: novo } })}
              />
            )}
          </Campo>
        </div>
      </div>
      {soLeitura && (
        <Aviso tom="leitura">
          <Trans>O ano lectivo está encerrado. O quadro está só de leitura.</Trans>
        </Aviso>
      )}
      {anoLectivoId && (
        <QuadroTurmas anoLectivoId={anoLectivoId} classeId={classeId} soLeitura={soLeitura} />
      )}
    </section>
  )
}
