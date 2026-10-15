import { Trans } from '@lingui/react/macro'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { registarErro } from '@/shared/lib/registo'
import { Button } from './button'

/** Cada rota tem o seu ecrã de erro com Tentar de novo; um erro numa área não derruba a aplicação (guia 4.6). */
export function ErroDeRota({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const { reset: limparErrosDeQuery } = useQueryErrorResetBoundary()

  useEffect(() => {
    limparErrosDeQuery()
    registarErro(error)
  }, [limparErrosDeQuery, error])

  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-16">
      <p className="text-subtitulo">
        <Trans>Não foi possível carregar esta página.</Trans>
      </p>
      <p className="text-secundario text-texto-2">
        <Trans>Verifique a ligação e tente de novo.</Trans>
      </p>
      <Button
        variante="secundario"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        <Trans>Tentar de novo</Trans>
      </Button>
    </div>
  )
}
