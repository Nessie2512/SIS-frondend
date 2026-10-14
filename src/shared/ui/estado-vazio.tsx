import type { ReactNode } from 'react'

interface Props {
  titulo: string
  descricao?: string
  accao?: ReactNode
}

/** Estado vazio: uma frase clara e uma acção (guia 6.2). */
export function EstadoVazio({ titulo, descricao, accao }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="text-subtitulo">{titulo}</p>
      {descricao && <p className="max-w-sm text-secundario text-texto-2">{descricao}</p>}
      {accao && <div className="mt-2">{accao}</div>}
    </div>
  )
}
