import { createFileRoute } from '@tanstack/react-router'
import { ciclosQuery } from '@/entities/classe'
import { ArvoreClasses } from '@/features/gerir-classes'
import { TEMPOS } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import { ErroDeRota, Esqueleto } from '@/shared/ui'

export const Route = createFileRoute('/_app/curriculo/classes')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(ciclosQuery()),
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: Classes,
})

function Classes() {
  const podeEditar = useCan('curriculo:escrever')
  return <ArvoreClasses podeEditar={podeEditar} />
}
