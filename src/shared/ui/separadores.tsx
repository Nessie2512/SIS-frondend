import { Tabs, ToggleGroup } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/* Separadores (guia 6.2): texto ou com contador; activo, foco, desactivado. */
export const Separadores = Tabs.Root

export function ListaSeparadores({ children, rotulo }: { children: ReactNode; rotulo: string }) {
  return (
    // Em ecrãs estreitos, os separadores deslizam na horizontal em vez de se sobreporem
    <Tabs.List
      aria-label={rotulo}
      className="flex gap-4 overflow-x-auto border-b border-linha [scrollbar-width:none]"
    >
      {children}
    </Tabs.List>
  )
}

interface PropsSeparador {
  valor: string
  children: ReactNode
  contador?: number
  desactivado?: boolean
}

export function Separador({ valor, children, contador, desactivado }: PropsSeparador) {
  return (
    <Tabs.Trigger
      value={valor}
      disabled={desactivado}
      className={cn(
        '-mb-px flex h-9 shrink-0 items-center gap-1.5 border-b-2 border-transparent text-corpo whitespace-nowrap text-texto-2',
        'transition-colors duration-(--duracao-micro) hover:text-texto-1',
        'data-[state=active]:border-acento data-[state=active]:text-texto-1',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      {children}
      {contador !== undefined && (
        <span className="tabular rounded-full bg-linha px-1.5 text-legenda text-texto-2">
          {contador}
        </span>
      )}
    </Tabs.Trigger>
  )
}

export const PainelSeparador = Tabs.Content

interface OpcaoSegmento {
  valor: string
  rotulo: string
  desactivado?: boolean
}

interface PropsSegmentado {
  rotulo: string
  opcoes: OpcaoSegmento[]
  valor: string
  aoMudar: (valor: string) => void
}

/** Controlo segmentado: escolha única entre poucas opções (ex.: Activas / Encerradas). */
export function ControloSegmentado({ rotulo, opcoes, valor, aoMudar }: PropsSegmentado) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={rotulo}
      value={valor}
      onValueChange={(novo) => novo && aoMudar(novo)}
      className="inline-flex rounded-controlo bg-linha p-0.5 text-secundario"
    >
      {opcoes.map((opcao) => (
        <ToggleGroup.Item
          key={opcao.valor}
          value={opcao.valor}
          disabled={opcao.desactivado}
          className={cn(
            'h-8 rounded-[6px] px-3 text-texto-2 transition-colors duration-(--duracao-micro)',
            'hover:text-texto-1 data-[state=on]:bg-superficie data-[state=on]:text-texto-1 data-[state=on]:shadow-elevado',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {opcao.rotulo}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
