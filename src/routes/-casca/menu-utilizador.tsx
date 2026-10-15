import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { meQuery, sair } from '@/entities/utilizador'
import { Avatar } from '@/shared/ui'

/** Utilizador autenticado e saída de sessão (guia 4.4). */
export function MenuUtilizador() {
  const { t } = useLingui()
  const { data: eu } = useQuery(meQuery())
  if (!eu) return null
  const nome = eu.nome

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label={t`Conta de ${nome}`} className="rounded-full">
        <Avatar nome={eu.nome} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-cartao bg-superficie p-1 shadow-flutuante ring-1 ring-linha data-[state=open]:animate-desvanecer-entrar"
        >
          <div className="px-2 py-1.5">
            <p className="text-corpo font-medium">{eu.nome}</p>
            <p className="text-secundario text-texto-3">{eu.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-linha" />
          <DropdownMenu.Item
            onSelect={() => void sair()}
            className="flex cursor-default items-center gap-2 rounded-controlo px-2 py-1.5 text-corpo outline-none data-highlighted:bg-fundo [&_svg]:size-4 [&_svg]:stroke-[1.5]"
          >
            <LogOut aria-hidden />
            <Trans>Terminar sessão</Trans>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
