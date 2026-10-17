import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { classesQuery } from '@/entities/classe'
import { TEMPOS } from '@/shared/config/constantes'
import { ErroDeRota, Esqueleto } from '@/shared/ui'

export const Route = createFileRoute('/_app/curriculo')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(classesQuery()),
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: LayoutCurriculo,
})

const classesLigacao =
  'flex h-8 items-center rounded-controlo px-3 text-texto-2 transition-colors duration-(--duracao-micro) hover:bg-superficie hover:text-texto-1 data-[status=active]:bg-superficie data-[status=active]:font-medium data-[status=active]:text-texto-1 data-[status=active]:shadow-elevado'

/**
 * Currículo (guia 2.5: árvore e edição no sítio): ciclos e classes à esquerda,
 * o plano da classe escolhida ou a lista de disciplinas à direita.
 */
function LayoutCurriculo() {
  const { t } = useLingui()
  const { data: classes = [] } = useQuery(classesQuery())

  // Agrupar por ciclo, mantendo a ordem das classes
  const ciclos: { nome: string; classes: typeof classes }[] = []
  for (const classe of [...classes].sort((a, b) => a.ordem - b.ordem)) {
    const ciclo = ciclos.find((c) => c.nome === classe.ciclo)
    if (ciclo) ciclo.classes.push(classe)
    else ciclos.push({ nome: classe.ciclo, classes: [classe] })
  }

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <nav aria-label={t`Currículo`} className="flex flex-col gap-5 text-corpo">
        <Link to="/curriculo/disciplinas" className={classesLigacao}>
          <BookOpen aria-hidden className="mr-2 size-4 stroke-[1.5]" />
          <Trans>Disciplinas</Trans>
        </Link>
        {ciclos.map((ciclo) => (
          <div key={ciclo.nome} className="flex flex-col gap-1">
            <h2 className="px-3 text-legenda text-texto-3">{ciclo.nome}</h2>
            <ul className="flex flex-col gap-0.5 border-l border-linha pl-2">
              {ciclo.classes.map((classe) => (
                <li key={classe.id}>
                  <Link
                    to="/curriculo"
                    search={{ classeId: classe.id }}
                    activeOptions={{ exact: true }}
                    className={classesLigacao}
                  >
                    {classe.designacao}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
