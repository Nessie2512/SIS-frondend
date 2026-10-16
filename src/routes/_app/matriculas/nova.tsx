import { Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { AssistenteMatricula } from '@/features/matricular-estudante'
import { useCan } from '@/shared/lib/permissoes'
import { Aviso } from '@/shared/ui'

export const Route = createFileRoute('/_app/matriculas/nova')({
  component: NovaMatricula,
})

/** Página dedicada para um fluxo longo (guia 7.3). */
function NovaMatricula() {
  const { anoLectivoId, soLeitura } = Route.useRouteContext()
  const podeMatricular = useCan('matriculas:escrever')
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const ano = anos.find((a) => a.id === anoLectivoId)
  const designacao = ano?.designacao

  return (
    <section className="flex flex-col gap-6">
      <Link
        to="/matriculas"
        search={{ page: 1 }}
        className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
      >
        <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Matrículas</Trans>
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-pagina">
          <Trans>Matricular estudante novo</Trans>
        </h1>
        <p className="text-secundario text-texto-2">
          <Trans>Ano lectivo {designacao}</Trans>
        </p>
      </div>
      {!podeMatricular ? (
        <Aviso tom="informacao">
          <Trans>A sua conta não tem permissão para matricular estudantes.</Trans>
        </Aviso>
      ) : soLeitura || !anoLectivoId ? (
        <Aviso tom="leitura">
          <Trans>
            O ano lectivo está encerrado. Escolha o ano em curso no cabeçalho para matricular.
          </Trans>
        </Aviso>
      ) : (
        <AssistenteMatricula anoLectivoId={anoLectivoId} anoInicio={ano?.dataInicio} />
      )}
    </section>
  )
}
