import { createFileRoute } from '@tanstack/react-router'
import { disciplinasQuery } from '@/entities/disciplina'
import { ListaDisciplinas } from '@/features/gerir-disciplinas'
import { TEMPOS } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import { ErroDeRota, Esqueleto } from '@/shared/ui'

export const Route = createFileRoute('/_app/curriculo/disciplinas')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(disciplinasQuery()),
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: Disciplinas,
})

function Disciplinas() {
  const podeEditar = useCan('curriculo:escrever')
  return <ListaDisciplinas podeEditar={podeEditar} />
}
