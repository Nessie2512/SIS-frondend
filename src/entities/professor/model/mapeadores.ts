import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type { DisciplinaSis, DtoSis, ProfessorSis } from '@/shared/api/sis'
import type {
  Atribuicao,
  EstadoProfessor,
  PaginaProfessores,
  Professor,
  ProfessorResumo,
  TomEstado,
} from './tipos'

/** Área de formação do SIS (teacherField) → texto. */
export const AREAS_PROFESSOR: Record<string, MessageDescriptor> = {
  STEM: msg`Ciências e tecnologia`,
  BUSINESS: msg`Economia e gestão`,
  MEDICINE: msg`Saúde`,
  ARTS: msg`Artes e humanidades`,
}

/** Habilitação do SIS (educationalAttainment) → texto. */
export const HABILITACOES_PROFESSOR: Record<string, MessageDescriptor> = {
  'High School Graduate': msg`Ensino médio`,
  'Technical School certificate': msg`Ensino técnico`,
  "Bachelor's degree": msg`Licenciatura`,
  "Master's degree": msg`Mestrado`,
  'Ph.D.': msg`Doutoramento`,
}

const texto = (rotulos: Record<string, MessageDescriptor>, valor: string | null | undefined) =>
  valor ? (rotulos[valor] ? i18n._(rotulos[valor]) : valor) : null

/** Datas do SIS: «DD/MM/AAAA» ou ISO → AAAA-MM-DD. */
function dataCivil(valor: string | null | undefined): string | null {
  if (!valor) return null
  const dma = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim())
  return dma ? `${dma[3]}-${dma[2]}-${dma[1]}` : valor.slice(0, 10)
}

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

/**
 * Backend SIS: o professor não traz contactos, carga lectiva nem disciplinas habilitadas; a área
 * de formação (teacherField) faz de texto das disciplinas. Inactivo = desligado.
 */
/**
 * Backend SIS: as disciplinas do professor são as especialidades (specialtySubjectIds), as
 * únicas em que se lhe pode atribuir turma. Sem a lista das disciplinas, mostra-se a área.
 */
export function paraProfessorResumoDoSis(
  dto: ProfessorSis,
  disciplinaPorId?: Map<number, DisciplinaSis>,
): ProfessorResumo {
  const disciplinas = (dto.specialtySubjectIds ?? []).flatMap((n) => {
    const d = disciplinaPorId?.get(n)
    return d ? [{ id: d.uuid, nome: d.name, sigla: d.code }] : []
  })
  return comEstado(
    {
      id: dto.uuid,
      numeroAgente: dto.teacherCode,
      nome: dto.name,
      estado: 'ACTIVO',
      estadoRotulo: '',
      estadoTom: 'neutra',
      disponivel: dto.isActive,
      disciplinas,
      disciplinasTexto: disciplinas.length
        ? disciplinas.map((d) => d.nome).join(', ')
        : (texto(AREAS_PROFESSOR, dto.teacherField) ?? ''),
      cargaLectiva: 0,
      cargaMaxima: 0,
      ocupacao: 0,
      telefone: null,
      email: null,
      fotografiaUrl: null,
    },
    dto.isActive ? 'ACTIVO' : 'DESLIGADO',
  )
}

/** Referências já resolvidas (turma, classe, disciplina) para as atribuições do backend SIS. */
export interface ReferenciasAtribuicao {
  turma: (id: number) => { uuid: string; nome: string; classe: string } | undefined
  disciplina: (id: number) => { uuid: string; nome: string } | undefined
}

export function paraProfessorDoSis(
  dto: ProfessorSis,
  atribuicoes: DtoSis<'TeacherAssignmentOutputDto'>[],
  ref: ReferenciasAtribuicao,
  disciplinaPorId?: Map<number, DisciplinaSis>,
): Professor {
  return {
    ...paraProfessorResumoDoSis(dto, disciplinaPorId),
    habilitacao: texto(HABILITACOES_PROFESSOR, dto.educationalAttainment) ?? '',
    // O backend não devolve a data de admissão
    dataAdmissao: '',
    dadosPessoais: {
      sexo: dto.sex === 'F' ? 'F' : 'M',
      dataNascimento: dataCivil(dto.birthDate),
      idade: Number.isFinite(dto.age) ? dto.age : null,
      morada: dto.address?.trim() || null,
      nacionalidade: dto.nationality?.trim() || null,
      area: texto(AREAS_PROFESSOR, dto.teacherField),
      supervisor: dto.isSupervisor,
    },
    atribuicoes: atribuicoes
      .filter((a) => a.isActive)
      .map((a): Atribuicao => {
        const turma = ref.turma(a.classId)
        const disciplina = ref.disciplina(a.subjectId)
        return {
          id: a.uuid,
          turmaId: turma?.uuid ?? '',
          turma: turma?.nome ?? '',
          classe: turma?.classe ?? '',
          disciplinaId: disciplina?.uuid ?? '',
          disciplina: disciplina?.nome ?? '',
          horasSemanais: 0,
          desde: '',
        }
      }),
    documentos: [],
    documentosEmFalta: 0,
  }
}
