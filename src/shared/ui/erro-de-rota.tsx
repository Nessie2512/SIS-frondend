import type { ErrorComponentProps } from '@tanstack/react-router'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from './button'

/** Cada rota tem o seu ecrã de erro com Tentar de novo; um erro numa área não derruba a aplicação (guia 4.6). */
export function ErroDeRota({ reset }: ErrorComponentProps) {
  const router = useRouter()
  const { reset: limparErrosDeQuery } = useQueryErrorResetBoundary()

  useEffect(() => {
    limparErrosDeQuery()
  }, [limparErrosDeQuery])

  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-16">
      <p className="text-subtitulo">Não foi possível carregar esta página.</p>
      <p className="text-secundario text-texto-2">Verifique a ligação e tente de novo.</p>
      <Button
        variante="secundario"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Tentar de novo
      </Button>
    </div>
  )
}
