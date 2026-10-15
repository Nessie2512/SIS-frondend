import { Trans } from '@lingui/react/macro'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import * as z from 'zod/mini'
import { garantirSessao } from '@/entities/utilizador'
import { FormularioEntrada } from '@/features/autenticar'

export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({ voltar: z.catch(z.optional(z.string()), undefined) }),
  // Quem já tem sessão (ou a recupera pelo cookie) não vê o ecrã de entrada
  beforeLoad: async ({ search }) => {
    if (await garantirSessao()) throw redirect({ href: destinoSeguro(search.voltar) })
  },
  component: EcraEntrada,
})

/** Só aceita caminhos internos, para o ?voltar= não servir de redireccionamento aberto. */
function destinoSeguro(voltar: string | undefined) {
  return voltar?.startsWith('/') && !voltar.startsWith('//') ? voltar : '/'
}

function EcraEntrada() {
  const router = useRouter()
  const { voltar } = Route.useSearch()
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fundo p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-folha bg-superficie p-8 shadow-elevado ring-1 ring-linha">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Secretaria</Trans>
          </h1>
          <p className="text-secundario text-texto-2">
            <Trans>Entre com a sua conta da escola.</Trans>
          </p>
        </div>
        <FormularioEntrada aoEntrar={() => void router.history.push(destinoSeguro(voltar))} />
      </div>
    </main>
  )
}
