import { useLingui } from '@lingui/react/macro'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface PropsBase {
  aberta: boolean
  aoMudar: (aberta: boolean) => void
  titulo: string
  descricao?: string
  children?: ReactNode
  /** Botões no rodapé; o primário fica à direita */
  rodape?: ReactNode
  /** Estado pendente: impede fechar a meio de uma acção */
  pendente?: boolean
}

const classesSobreposicao =
  'fixed inset-0 z-40 bg-black/30 data-[state=closed]:animate-desvanecer-sair data-[state=open]:animate-desvanecer-entrar'

function Cabecalho({ titulo, descricao }: { titulo: string; descricao?: string }) {
  const { t } = useLingui()
  return (
    <header className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Dialog.Title className="text-titulo-seccao">{titulo}</Dialog.Title>
        {descricao ? (
          <Dialog.Description className="text-secundario text-texto-2">
            {descricao}
          </Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
        )}
      </div>
      <Dialog.Close
        aria-label={t`Fechar`}
        className="-m-1 rounded-controlo p-1 text-texto-3 hover:text-texto-1 [&_svg]:size-5 [&_svg]:stroke-[1.5]"
      >
        <X aria-hidden />
      </Dialog.Close>
    </header>
  )
}

/**
 * Folha lateral (guia 6.3, 7.3): ver ou editar sem perder a lista; 480 px à direita.
 * Foco preso, Esc fecha e o foco volta ao elemento que a abriu (guia 8.1).
 */
export function Folha({
  aberta,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  pendente,
}: PropsBase) {
  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => !pendente && aoMudar(v)}>
      <Dialog.Portal>
        <Dialog.Overlay className={classesSobreposicao} />
        <Dialog.Content
          aria-busy={pendente || undefined}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-superficie/95 shadow-flutuante backdrop-blur-xl',
            'rounded-l-folha data-[state=closed]:animate-folha-sair data-[state=open]:animate-folha-entrar',
          )}
        >
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <Cabecalho titulo={titulo} descricao={descricao} />
            <div className="flex-1">{children}</div>
          </div>
          {rodape && (
            <footer className="flex justify-end gap-2 border-t border-linha px-6 py-4">
              {rodape}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Diálogo central pequeno: só para confirmar o irreversível, com o efeito concreto escrito
 * (guia 5.4, 7.3). Nunca "Tem a certeza?".
 */
export function Dialogo({
  aberta,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  pendente,
}: PropsBase) {
  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => !pendente && aoMudar(v)}>
      <Dialog.Portal>
        <Dialog.Overlay className={classesSobreposicao} />
        <Dialog.Content
          aria-busy={pendente || undefined}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-6',
            'rounded-folha bg-superficie p-6 shadow-flutuante data-[state=open]:animate-dialogo-entrar',
          )}
        >
          <Cabecalho titulo={titulo} descricao={descricao} />
          {children}
          {rodape && <footer className="flex justify-end gap-2">{rodape}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
