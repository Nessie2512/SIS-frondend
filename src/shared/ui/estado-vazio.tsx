import { Inbox, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  titulo: string
  descricao?: string
  accao?: ReactNode
  /** Primeira utilização (nada criado ainda) ou filtro sem resultados */
  variante?: 'primeira-utilizacao' | 'sem-resultados'
}

/** Estado vazio (guia 6.2): uma frase clara e uma acção. */
export function EstadoVazio({ titulo, descricao, accao, variante = 'primeira-utilizacao' }: Props) {
  const Icone = variante === 'sem-resultados' ? SearchX : Inbox
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Icone aria-hidden className="mb-2 size-6 stroke-[1.5] text-texto-3" />
      <p className="text-subtitulo">{titulo}</p>
      {descricao && <p className="max-w-sm text-secundario text-texto-2">{descricao}</p>}
      {accao && <div className="mt-2">{accao}</div>}
    </div>
  )
}
