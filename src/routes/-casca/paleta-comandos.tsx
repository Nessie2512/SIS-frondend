import { Trans, useLingui } from '@lingui/react/macro'
import { useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Contrast,
  GraduationCap,
  Home,
  Keyboard,
  Moon,
  PanelLeft,
  Presentation,
  Rows3,
  Rows4,
  Settings,
  Sun,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { usePesquisa } from '@/features/pesquisar'
import { mostrarAtalho } from '@/shared/lib/atalhos'
import { usePreferencias } from '@/shared/lib/preferencias'
import type { ReactNode } from 'react'

interface Props {
  aberta: boolean
  aoMudar: (aberta: boolean) => void
  aoMostrarAtalhos: () => void
}

/**
 * Paleta de comandos (guia 1.1, 6.2, 7.5): ⌘K / Ctrl+K para navegar, agir e encontrar
 * estudantes (nome ou n.º de processo) e turmas sem largar o teclado.
 */
export function PaletaComandos({ aberta, aoMudar, aoMostrarAtalhos }: Props) {
  const { t } = useLingui()
  const router = useRouter()
  const definirTema = usePreferencias((e) => e.definirTema)
  const definirDensidade = usePreferencias((e) => e.definirDensidade)
  const menuRecolhido = usePreferencias((e) => e.menuRecolhido)
  const definirMenuRecolhido = usePreferencias((e) => e.definirMenuRecolhido)
  const [procura, setProcura] = useState('')
  const pesquisa = usePesquisa(procura)

  function mudar(aberta: boolean) {
    if (!aberta) setProcura('')
    aoMudar(aberta)
  }

  function executar(accao: () => void) {
    mudar(false)
    accao()
  }

  return (
    <Command.Dialog
      open={aberta}
      onOpenChange={mudar}
      label={t`Paleta de comandos`}
      loop
      overlayClassName="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-desvanecer-entrar"
      contentClassName="fixed top-[15vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-folha bg-superficie/95 shadow-flutuante ring-1 ring-linha backdrop-blur-xl data-[state=open]:animate-desvanecer-entrar"
    >
      <Command.Input
        value={procura}
        onValueChange={setProcura}
        placeholder={t`Procurar estudante, turma ou comando`}
        className="h-12 w-full border-b border-linha bg-transparent px-4 text-corpo outline-none placeholder:text-texto-3"
      />
      <Command.List className="max-h-[50vh] overflow-y-auto p-2">
        {pesquisa.aProcurar && (
          <Command.Loading className="px-3 py-2 text-secundario text-texto-3">
            <Trans>A procurar…</Trans>
          </Command.Loading>
        )}
        <Command.Empty className="px-3 py-6 text-center text-secundario text-texto-3">
          {pesquisa.activa && pesquisa.aProcurar ? (
            <Trans>A procurar…</Trans>
          ) : (
            <Trans>Nada encontrado. Experimente o número de processo.</Trans>
          )}
        </Command.Empty>
        {pesquisa.estudantes.length > 0 && (
          <Grupo titulo={t`Estudantes`}>
            {pesquisa.estudantes.map((e) => (
              <Item
                key={e.id}
                valor={`estudante ${e.id} ${e.nome} ${e.numeroProcesso}`}
                palavras={[procura]}
                icone={<UserRound />}
                detalhe={[e.numeroProcesso, e.matricula].filter(Boolean).join(' · ')}
                aoEscolher={() =>
                  executar(
                    () =>
                      void router.navigate({
                        to: '/estudantes/$estudanteId',
                        params: { estudanteId: e.id },
                      }),
                  )
                }
              >
                {e.nome}
              </Item>
            ))}
          </Grupo>
        )}
        {pesquisa.turmas.length > 0 && (
          <Grupo titulo={t`Turmas`}>
            {pesquisa.turmas.map((turma) => (
              <Item
                key={turma.id}
                valor={`turma ${turma.id} ${turma.designacao}`}
                palavras={[procura]}
                icone={<Users />}
                detalhe={turma.classe}
                aoEscolher={() =>
                  executar(
                    () => void router.navigate({ to: '/turmas', search: { turma: turma.id } }),
                  )
                }
              >
                {turma.designacao}
              </Item>
            ))}
          </Grupo>
        )}
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
          <Item
            icone={<Presentation />}
            atalho="g p"
            aoEscolher={() =>
              executar(() => void router.navigate({ to: '/professores', search: { page: 1 } }))
            }
          >
            <Trans>Professores</Trans>
          </Item>
          <Item
            icone={<BookOpen />}
            aoEscolher={() =>
              executar(() => void router.navigate({ to: '/curriculo', search: { classeId: 'c7' } }))
            }
          >
            <Trans>Currículo</Trans>
          </Item>
          <Item
            icone={<CalendarDays />}
            aoEscolher={() => executar(() => void router.navigate({ to: '/calendario' }))}
          >
            <Trans>Calendário</Trans>
          </Item>
          <Item
            icone={<FileSpreadsheet />}
            aoEscolher={() => executar(() => void router.navigate({ to: '/relatorios' }))}
          >
            <Trans>Relatórios</Trans>
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
          <Item
            icone={<Settings />}
            aoEscolher={() => executar(() => void router.navigate({ to: '/definicoes' }))}
          >
            <Trans>Abrir as definições</Trans>
          </Item>
          <Item
            icone={<PanelLeft />}
            atalho="mod+b"
            aoEscolher={() => executar(() => definirMenuRecolhido(!menuRecolhido))}
          >
            {menuRecolhido ? (
              <Trans>Expandir o menu lateral</Trans>
            ) : (
              <Trans>Recolher o menu lateral</Trans>
            )}
          </Item>
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
  valor,
  palavras,
  detalhe,
  aoEscolher,
  children,
}: {
  icone: ReactNode
  atalho?: string
  /** Valor único para resultados do servidor (nomes podem repetir-se) */
  valor?: string
  /** Resultados do servidor já vêm filtrados: o termo entra como palavra-chave para ficarem */
  palavras?: string[]
  detalhe?: string | null
  aoEscolher: () => void
  children: ReactNode
}) {
  return (
    <Command.Item
      value={valor}
      keywords={palavras}
      onSelect={aoEscolher}
      className="flex h-10 cursor-default items-center gap-3 rounded-controlo px-3 text-corpo data-[selected=true]:bg-fundo [&_svg]:size-4 [&_svg]:stroke-[1.5] [&_svg]:text-texto-2"
    >
      {icone}
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate">{children}</span>
        {detalhe && <span className="truncate text-legenda text-texto-3">{detalhe}</span>}
      </span>
      {atalho && <kbd className="tabular text-legenda text-texto-3">{mostrarAtalho(atalho)}</kbd>}
    </Command.Item>
  )
}
