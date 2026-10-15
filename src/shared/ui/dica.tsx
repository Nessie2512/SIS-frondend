import { Tooltip } from 'radix-ui'
import type { ReactNode } from 'react'
import { TEMPOS } from '@/shared/config/constantes'

/** Envolve a aplicação (ou a história) uma vez. */
export function FornecedorDicas({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={TEMPOS.dica} skipDelayDuration={200}>
      {children}
    </Tooltip.Provider>
  )
}

interface Props {
  texto: string
  children: ReactNode
  lado?: 'top' | 'right' | 'bottom' | 'left'
}

/** Dica (guia 6.2): atraso de 400 ms; aparece também no foco do teclado. */
export function Dica({ texto, children, lado = 'top' }: Props) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={lado}
          sideOffset={6}
          className="z-50 max-w-64 rounded-controlo bg-texto-1 px-2 py-1 text-legenda text-fundo shadow-flutuante"
        >
          {texto}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
