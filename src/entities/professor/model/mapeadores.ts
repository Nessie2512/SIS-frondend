import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type {
  EstadoProfessor,
  PaginaProfessores,
  Professor,
  ProfessorResumo,
  TomEstado,
} from './tipos'

export const ESTADOS_PROFESSOR = {
  ACTIVO: { rotulo: msg`Activo`, tom: 'sucesso' },
  LICENCA: { rotulo: msg`De licença`, tom: 'aviso' },
  SUSPENSO: { rotulo: msg`Suspenso`, tom: 'perigo' },
  DESLIGADO: { rotulo: msg`Desligado`, tom: 'neutra' },
} as const satisfies Record<EstadoProfessor, { rotulo: MessageDescriptor; tom: TomEstado }>

export const rotuloEstadoProfessor = (estado: EstadoProfessor) =>
  i18n._(ESTADOS_PROFESSOR[estado].rotulo)

/** Aplica um estado ao modelo de vista (usado também nas mutações optimistas). */
export function comEstado<T extends ProfessorResumo>(professor: T, estado: EstadoProfessor): T {
  return {
    ...professor,
    estado,
    estadoRotulo: rotuloEstadoProfessor(estado),
    estadoTom: ESTADOS_PROFESSOR[estado].tom,
    disponivel: estado === 'ACTIVO',
  }
}

export function paraProfessorResumo(dto: Dto<'ProfessorResumoDto'>): ProfessorResumo {
  return comEstado(
    {
      id: dto.id,
      numeroAgente: dto.numeroAgente,
      nome: dto.nome,
      estado: dto.estado,
      estadoRotulo: '',
      estadoTom: 'neutra',
      disponivel: false,
      disciplinas: dto.disciplinas.map((d) => ({ ...d })),
      disciplinasTexto: dto.disciplinas.map((d) => d.nome).join(', '),
      cargaLectiva: dto.cargaLectiva,
      cargaMaxima: dto.cargaMaxima,
      ocupacao: dto.cargaMaxima ? Math.min(1, dto.cargaLectiva / dto.cargaMaxima) : 0,
      telefone: dto.telefone,
      email: dto.email,
      fotografiaUrl: dto.fotografiaUrl,
    },
    dto.estado,
  )
}

export function paraProfessor(dto: Dto<'ProfessorDto'>): Professor {
  const documentos = dto.documentos.map((d) => ({
    tipo: d.tipo,
    rotulo: d.rotulo,
    entregue: d.estado === 'ENTREGUE',
  }))
  return {
    ...paraProfessorResumo(dto),
    habilitacao: dto.habilitacao,
    dataAdmissao: dto.dataAdmissao,
    atribuicoes: dto.atribuicoes.map((a) => ({ ...a })),
    documentos,
    documentosEmFalta: documentos.filter((d) => !d.entregue).length,
  }
}

export function paraPaginaProfessores(dto: Dto<'PaginaProfessorDto'>): PaginaProfessores {
  return {
    professores: dto.items.map(paraProfessorResumo),
    total: dto.total,
    page: dto.page,
    totalPaginas: Math.max(1, Math.ceil(dto.total / dto.pageSize)),
  }
}
