import { Trans, useLingui } from '@lingui/react/macro'
import { useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import {
  ClipboardList,
  Contrast,
  GraduationCap,
  Home,
  Keyboard,
  Moon,
  Rows3,
  Rows4,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react'
import { mostrarAtalho } from '@/shared/lib/atalhos'
import { usePreferencias } from '@/shared/lib/preferencias'
import type { ReactNode } from 'react'

interface Props {
  aberta: boolean
  aoMudar: (aberta: boolean) => void
  aoMostrarAtalhos: () => void
}

/**
 * Paleta de comandos (guia 1.1, 6.2, 7.5): ⌘K / Ctrl+K para navegar e agir sem largar o teclado.
 * A pesquisa de estudantes e turmas entra quando a API estiver disponível.
 */
export function PaletaComandos({ aberta, aoMudar, aoMostrarAtalhos }: Props) {
  const { t } = useLingui()
  const router = useRouter()
  const definirTema = usePreferencias((e) => e.definirTema)
  const definirDensidade = usePreferencias((e) => e.definirDensidade)

  function executar(accao: () => void) {
    aoMudar(false)
    accao()
  }

  return (
    <Command.Dialog
      open={aberta}
      onOpenChange={aoMudar}
      label={t`Paleta de comandos`}
      loop
      overlayClassName="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-desvanecer-entrar"
      contentClassName="fixed top-[15vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-folha bg-superficie/95 shadow-flutuante ring-1 ring-linha backdrop-blur-xl data-[state=open]:animate-desvanecer-entrar"
    >
      <Command.Input
        placeholder={t`Escreva um comando ou o nome de um ecrã`}
        className="h-12 w-full border-b border-linha bg-transparent px-4 text-corpo outline-none placeholder:text-texto-3"
      />
      <Command.List className="max-h-[50vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-secundario text-texto-3">
          <Trans>Nenhum comando encontrado.</Trans>
        </Command.Empty>
        <Grupo titulo={t`Navegar`}>
          <Item
            icone={<Home />}
            atalho="g i"
            aoEscolher={() => executar(() => void router.navigate({ to: '/' }))}
          >
            <Trans>Início</Trans>
          </Item>
          <Item
            icone={<GraduationCap />}
            atalho="g e"
            aoEscolher={() =>
              executar(() => void router.navigate({ to: '/estudantes', search: { page: 1 } }))
            }
          >
            <Trans>Estudantes</Trans>
          </Item>
          <Item
            icone={<ClipboardList />}
            atalho="g m"
            aoEscolher={() =>
              executar(() => void router.navigate({ to: '/matriculas', search: { page: 1 } }))
            }
          >
            <Trans>Matrículas</Trans>
          </Item>
          <Item
            icone={<Users />}
            atalho="g t"
            aoEscolher={() => executar(() => void router.navigate({ to: '/turmas' }))}
          >
            <Trans>Turmas</Trans>
          </Item>
        </Grupo>
        <Grupo titulo={t`Agir`}>
          <Item
            icone={<UserPlus />}
            aoEscolher={() => executar(() => void router.navigate({ to: '/matriculas/nova' }))}
          >
            <Trans>Matricular estudante novo</Trans>
          </Item>
        </Grupo>
        <Grupo titulo={t`Preferências`}>
          <Item icone={<Sun />} aoEscolher={() => executar(() => definirTema('claro'))}>
            <Trans>Usar tema claro</Trans>
          </Item>
          <Item icone={<Moon />} aoEscolher={() => executar(() => definirTema('escuro'))}>
            <Trans>Usar tema escuro</Trans>
          </Item>
          <Item icone={<Contrast />} aoEscolher={() => executar(() => definirTema('sistema'))}>
            <Trans>Seguir o tema do sistema</Trans>
          </Item>
          <Item
            icone={<Rows3 />}
            aoEscolher={() => executar(() => definirDensidade('confortavel'))}
          >
            <Trans>Densidade confortável</Trans>
          </Item>
          <Item icone={<Rows4 />} aoEscolher={() => executar(() => definirDensidade('compacta'))}>
            <Trans>Densidade compacta</Trans>
          </Item>
        </Grupo>
        <Grupo titulo={t`Ajuda`}>
          <Item icone={<Keyboard />} atalho="?" aoEscolher={() => executar(aoMostrarAtalhos)}>
            <Trans>Mostrar todos os atalhos</Trans>
          </Item>
        </Grupo>
      </Command.List>
    </Command.Dialog>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={titulo}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-legenda [&_[cmdk-group-heading]]:text-texto-3"
    >
      {children}
    </Command.Group>
  )
}

function Item({
  icone,
  atalho,
  aoEscolher,
  children,
}: {
  icone: ReactNode
  atalho?: string
  aoEscolher: () => void
  children: ReactNode
}) {
  return (
    <Command.Item
      onSelect={aoEscolher}
      className="flex h-10 cursor-default items-center gap-3 rounded-controlo px-3 text-corpo data-[selected=true]:bg-fundo [&_svg]:size-4 [&_svg]:stroke-[1.5] [&_svg]:text-texto-2"
    >
      {icone}
      <span className="flex-1">{children}</span>
      {atalho && <kbd className="tabular text-legenda text-texto-3">{mostrarAtalho(atalho)}</kbd>}
    </Command.Item>
  )
}
