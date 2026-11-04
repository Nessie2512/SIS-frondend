import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { Menu, PanelLeftClose, PanelLeftOpen, School, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'
import { mostrarAtalho } from '@/shared/lib/atalhos'
import { cn } from '@/shared/lib/cn'
import { usePreferencias } from '@/shared/lib/preferencias'
import { Dica } from '@/shared/ui'
import { useAreas, type Area } from './areas'

/** Larguras do menu lateral; o layout usa-as também para afastar o quadro de tarefas. */
export const LARGURA_MENU = { expandido: '15rem', recolhido: '4rem' } as const

type Entrada = Area

const classesItem = cn(
  'flex h-9 items-center gap-3 rounded-controlo px-2.5 text-corpo whitespace-nowrap text-texto-2 outline-none',
  'transition-colors duration-(--duracao-micro) hover:bg-fundo hover:text-texto-1',
  'focus-visible:ring-2 focus-visible:ring-acento',
  'data-[status=active]:bg-fundo data-[status=active]:font-medium data-[status=active]:text-texto-1',
  'data-[status=active]:[&_svg]:text-acento',
  '[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
)

function ItemMenu({
  entrada,
  recolhido,
  aoNavegar,
}: {
  entrada: Entrada
  recolhido: boolean
  aoNavegar?: () => void
}) {
  const atalho = entrada.atalho ? mostrarAtalho(entrada.atalho) : undefined
  const ligacao = (
    <Link
      {...entrada.ligacao}
      activeOptions={{ exact: entrada.exacto ?? false, includeSearch: false }}
      onClick={aoNavegar}
      className={cn(classesItem, recolhido && 'justify-center px-0')}
    >
      <span aria-hidden className="flex">
        {entrada.icone}
      </span>
      {/* Recolhido, o nome continua lá para leitores de ecrã e aparece numa dica */}
      <span className={cn('truncate', recolhido && 'sr-only')}>{entrada.rotulo}</span>
    </Link>
  )
  if (!recolhido) return ligacao
  return (
    <Dica texto={atalho ? `${entrada.rotulo} · ${atalho}` : entrada.rotulo} lado="right">
      {ligacao}
    </Dica>
  )
}

function Marca({ recolhido }: { recolhido: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        'flex h-14 shrink-0 items-center gap-3 px-3.5 outline-none focus-visible:ring-2 focus-visible:ring-acento',
        recolhido && 'justify-center px-0',
      )}
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-controlo bg-acento text-sobre-acento [&_svg]:size-4.5 [&_svg]:stroke-[1.75]"
      >
        <School />
      </span>
      <span className={cn('text-subtitulo whitespace-nowrap', recolhido && 'sr-only')}>
        <Trans>Secretaria</Trans>
      </span>
    </Link>
  )
}

function ListaMenu({ recolhido, aoNavegar }: { recolhido: boolean; aoNavegar?: () => void }) {
  const { t } = useLingui()
  const { principais } = useAreas()
  return (
    <nav aria-label={t`Principal`} className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-0.5">
        {principais.map((entrada) => (
          <li key={entrada.id}>
            <ItemMenu entrada={entrada} recolhido={recolhido} aoNavegar={aoNavegar} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Menu lateral (ecrãs médios e grandes): ícone e nome, ou só ícones quando recolhido.
 * A escolha fica nas preferências; ⌘B / Ctrl+B alterna. Definições ficam no fundo.
 */
export function MenuLateral() {
  const { t } = useLingui()
  const recolhido = usePreferencias((e) => e.menuRecolhido)
  const definirMenuRecolhido = usePreferencias((e) => e.definirMenuRecolhido)
  const { definicoes } = useAreas()
  const atalho = mostrarAtalho('mod+b')
  const rotuloAlternar = recolhido ? t`Expandir o menu` : t`Recolher o menu`

  return (
    <aside
      id="menu-lateral"
      aria-label={t`Navegação`}
      style={{ width: recolhido ? LARGURA_MENU.recolhido : LARGURA_MENU.expandido }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-linha bg-superficie transition-[width] duration-(--duracao-padrao) ease-padrao md:flex print:hidden"
    >
      <Marca recolhido={recolhido} />
      <ListaMenu recolhido={recolhido} />
      <div className="flex flex-col gap-0.5 border-t border-linha px-3 py-3">
        <ItemMenu entrada={definicoes} recolhido={recolhido} />
        <Dica texto={`${rotuloAlternar} · ${atalho}`} lado="right">
          <button
            type="button"
            aria-controls="menu-lateral"
            aria-expanded={!recolhido}
            aria-label={rotuloAlternar}
            onClick={() => definirMenuRecolhido(!recolhido)}
            className={cn(classesItem, 'w-full', recolhido && 'justify-center px-0')}
          >
            <span aria-hidden className="flex">
              {recolhido ? <PanelLeftOpen /> : <PanelLeftClose />}
            </span>
            <span aria-hidden className={cn('truncate', recolhido && 'sr-only')}>
              {recolhido ? <Trans>Expandir</Trans> : <Trans>Recolher</Trans>}
            </span>
          </button>
        </Dica>
      </div>
    </aside>
  )
}

/** No telemóvel o menu abre como gaveta, a partir do botão no cabeçalho, e fecha ao navegar. */
export function MenuMovel() {
  const { t } = useLingui()
  const [aberto, setAberto] = useState(false)
  const { definicoes } = useAreas()
  const fechar = () => setAberto(false)
  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      <Dialog.Trigger
        aria-label={t`Abrir o menu`}
        className="-ml-2 flex size-9 items-center justify-center rounded-controlo text-texto-2 hover:bg-fundo hover:text-texto-1 md:hidden [&_svg]:size-5 [&_svg]:stroke-[1.5]"
      >
        <Menu aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=closed]:animate-desvanecer-sair data-[state=open]:animate-desvanecer-entrar" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-superficie shadow-flutuante data-[state=closed]:animate-gaveta-sair data-[state=open]:animate-gaveta-entrar"
        >
          <Dialog.Title className="sr-only">
            <Trans>Menu</Trans>
          </Dialog.Title>
          <div className="flex items-center justify-between pr-3">
            <Marca recolhido={false} />
            <Dialog.Close
              aria-label={t`Fechar o menu`}
              className="flex size-9 items-center justify-center rounded-controlo text-texto-2 hover:bg-fundo [&_svg]:size-5 [&_svg]:stroke-[1.5]"
            >
              <X aria-hidden />
            </Dialog.Close>
          </div>
          <ListaMenu recolhido={false} aoNavegar={fechar} />
          <div className="border-t border-linha px-3 py-3">
            <ItemMenu entrada={definicoes} recolhido={false} aoNavegar={fechar} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
