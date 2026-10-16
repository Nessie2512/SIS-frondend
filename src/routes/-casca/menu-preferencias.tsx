import { useLingui } from '@lingui/react/macro'
import { Check, SlidersHorizontal } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { usePreferencias, type Densidade, type PreferenciaTema } from '@/shared/lib/preferencias'

const classesItem =
  'flex cursor-default items-center gap-2 rounded-controlo px-2 py-1.5 text-corpo outline-none data-highlighted:bg-fundo'

/** Tema (sistema, claro, escuro) e densidade (confortável, compacta), à escolha do utilizador (guia 6.1). */
export function MenuPreferencias() {
  const { t } = useLingui()
  const { tema, densidade, definirTema, definirDensidade } = usePreferencias()
  const temas: [PreferenciaTema, string][] = [
    ['sistema', t`Igual ao sistema`],
    ['claro', t`Claro`],
    ['escuro', t`Escuro`],
  ]
  const densidades: [Densidade, string][] = [
    ['confortavel', t`Confortável`],
    ['compacta', t`Compacta`],
  ]
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t`Preferências de apresentação`}
        className="flex size-8 items-center justify-center rounded-full text-texto-2 hover:bg-fundo hover:text-texto-1 [&_svg]:size-4 [&_svg]:stroke-[1.5]"
      >
        <SlidersHorizontal aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-52 rounded-cartao bg-superficie p-1 shadow-flutuante ring-1 ring-linha data-[state=open]:animate-desvanecer-entrar"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-legenda text-texto-3">{t`Tema`}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={tema}
            onValueChange={(v) => definirTema(v as PreferenciaTema)}
          >
            {temas.map(([valor, rotulo]) => (
              <DropdownMenu.RadioItem key={valor} value={valor} className={classesItem}>
                <Indicador />
                {rotulo}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-linha" />
          <DropdownMenu.Label className="px-2 py-1.5 text-legenda text-texto-3">{t`Densidade`}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={densidade}
            onValueChange={(v) => definirDensidade(v as Densidade)}
          >
            {densidades.map(([valor, rotulo]) => (
              <DropdownMenu.RadioItem key={valor} value={valor} className={classesItem}>
                <Indicador />
                {rotulo}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function Indicador() {
  return (
    <span className="flex size-4 items-center justify-center">
      <DropdownMenu.ItemIndicator>
        <Check aria-hidden className="size-4 stroke-[1.5] text-acento" />
      </DropdownMenu.ItemIndicator>
    </span>
  )
}
