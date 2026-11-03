import { useLingui } from '@lingui/react/macro'
import type { LinkProps } from '@tanstack/react-router'
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Home,
  Presentation,
  Settings,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { podeUsar, type Funcionalidade } from '@/shared/config/funcionalidades'
import { usePermissoesStore } from '@/shared/lib/permissoes'

export interface Area {
  id: Funcionalidade
  ligacao: LinkProps
  icone: ReactNode
  rotulo: string
  /** Uma frase para os cartões do início */
  descricao: string
  atalho?: string
  exacto?: boolean
}

/**
 * Áreas da aplicação que o utilizador pode abrir, pela ordem do menu (guia 2.7).
 * Menu lateral, paleta de comandos, atalhos g… e início usam esta lista.
 */
export function useAreas(): { principais: Area[]; definicoes: Area } {
  const { t } = useLingui()
  const permissoes = usePermissoesStore((e) => e.permissoes)
  const pode = (f: Funcionalidade) => podeUsar(f, permissoes)

  // Sem a lista de matrículas no servidor, a entrada Matrículas abre o assistente
  const matriculas: Area | null = pode('matriculas')
    ? {
        id: 'matriculas',
        ligacao: { to: '/matriculas', search: { page: 1 } },
        icone: <ClipboardList />,
        rotulo: t`Matrículas`,
        descricao: t`Confirmar, matricular e renovar.`,
        atalho: 'g m',
      }
    : pode('matricular')
      ? {
          id: 'matricular',
          ligacao: { to: '/matriculas/nova' },
          icone: <ClipboardList />,
          rotulo: t`Matrículas`,
          descricao: t`Registar e matricular um estudante novo.`,
          atalho: 'g m',
        }
      : null

  const todas: (Area | null)[] = [
    {
      id: 'inicio',
      ligacao: { to: '/' },
      icone: <Home />,
      rotulo: t`Início`,
      descricao: '',
      atalho: 'g i',
      exacto: true,
    },
    {
      id: 'estudantes',
      ligacao: { to: '/estudantes', search: { page: 1 } },
      icone: <GraduationCap />,
      rotulo: t`Estudantes`,
      descricao: t`Procurar estudantes e consultar a ficha.`,
      atalho: 'g e',
    },
    matriculas,
    {
      id: 'turmas',
      ligacao: { to: '/turmas' },
      icone: <Users />,
      rotulo: t`Turmas`,
      descricao: t`Turmas do ano, ocupação e distribuição.`,
      atalho: 'g t',
    },
    {
      id: 'professores',
      ligacao: { to: '/professores', search: { page: 1 } },
      icone: <Presentation />,
      rotulo: t`Professores`,
      descricao: t`Corpo docente, disciplinas e atribuições.`,
      atalho: 'g p',
    },
    {
      id: 'curriculo',
      ligacao: { to: '/curriculo', search: { classeId: 'c7' } },
      icone: <BookOpen />,
      rotulo: t`Currículo`,
      descricao: t`Ciclos, classes, disciplinas e planos.`,
    },
    {
      id: 'calendario',
      ligacao: { to: '/calendario' },
      icone: <CalendarDays />,
      rotulo: t`Calendário`,
      descricao: t`Trimestres, feriados e datas-chave.`,
    },
    {
      id: 'anosLectivos',
      ligacao: { to: '/anos-lectivos' },
      icone: <CalendarRange />,
      rotulo: t`Anos lectivos`,
      descricao: t`Abrir, activar e encerrar anos lectivos.`,
    },
    {
      id: 'documentosOficiais',
      ligacao: { to: '/documentos', search: { page: 1 } },
      icone: <FileText />,
      rotulo: t`Documentos`,
      descricao: t`Declarações, guias e diplomas emitidos.`,
    },
    {
      id: 'relatorios',
      ligacao: { to: '/relatorios' },
      icone: <FileSpreadsheet />,
      rotulo: t`Relatórios`,
      descricao: t`Contagens do ano lectivo.`,
    },
  ]

  return {
    principais: todas.filter((a): a is Area => a !== null && pode(a.id)),
    definicoes: {
      id: 'definicoes',
      ligacao: { to: '/definicoes' },
      icone: <Settings />,
      rotulo: t`Definições`,
      descricao: t`Preferências e a sua conta.`,
    },
  }
}
