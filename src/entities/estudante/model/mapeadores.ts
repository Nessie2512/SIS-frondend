import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { differenceInYears } from 'date-fns'
import type { Dto } from '@/shared/api'
import type {
  DocumentoEstudante,
  Encarregado,
  EstadoEstudante,
  Estudante,
  EstudanteResumo,
  EventoPercurso,
  Ocorrencia,
  PaginaEstudantes,
  TipoEventoPercurso,
  TipoOcorrencia,
  TomEstado,
} from './tipos'

const ESTADO = {
  ACTIVO: { rotulo: msg`Activo`, tom: 'sucesso' },
  TRANSFERIDO: { rotulo: msg`Transferido`, tom: 'aviso' },
  DESISTENTE: { rotulo: msg`Desistente`, tom: 'aviso' },
  CONCLUIDO: { rotulo: msg`Concluído`, tom: 'neutra' },
  ANULADO: { rotulo: msg`Anulado`, tom: 'perigo' },
} as const satisfies Record<EstadoEstudante, { rotulo: unknown; tom: TomEstado }>

const TIPO_EVENTO = {
  MATRICULA: msg`Matrícula`,
  INSCRICAO: msg`Inscrição na turma`,
  MUDANCA_TURMA: msg`Mudança de turma`,
  TRANSFERENCIA: msg`Transferência`,
  RESULTADO: msg`Resultado final`,
  RECTIFICACAO: msg`Rectificação`,
} satisfies Record<TipoEventoPercurso, unknown>

/** Idade a partir da data civil, sem conversão de fuso (guia 8.2). */
function idade(dataNascimento: string) {
  const [a, m, d] = dataNascimento.split('-').map(Number)
  return differenceInYears(new Date(), new Date(a!, m! - 1, d!))
}

export function paraEstudanteResumo(dto: Dto<'EstudanteResumoDto'>): EstudanteResumo {
  const estado = ESTADO[dto.estado]
  const m = dto.matriculaActual
  const turma = m?.turmaDesignacao ?? i18n._(msg`sem turma`)
  return {
    id: dto.id,
    numeroProcesso: dto.numeroProcesso,
    nome: dto.nome,
    dataNascimento: dto.dataNascimento,
    idade: idade(dto.dataNascimento),
    fotografiaUrl: dto.fotografiaUrl,
    estado: dto.estado,
    estadoRotulo: i18n._(estado.rotulo),
    estadoTom: estado.tom,
    matricula: m ? `${m.classeDesignacao} · ${turma}` : null,
    semTurma: Boolean(m && !m.turmaDesignacao),
    matriculaId: m?.id ?? null,
    turmaId: m?.turmaId ?? null,
    matriculaPendente: m?.estado === 'PENDENTE',
    documentosEmFalta: dto.documentosEmFalta,
  }
}

export function paraEstudante(dto: Dto<'EstudanteDto'>): Estudante {
  return {
    ...paraEstudanteResumo(dto),
    sexo: dto.sexo,
    documentoIdentificacao: dto.documentoIdentificacao,
    telefone: dto.telefone,
    morada: dto.morada,
    naturalidade: dto.naturalidade,
  }
}

export function paraPaginaEstudantes(dto: Dto<'PaginaEstudanteDto'>): PaginaEstudantes {
  return {
    estudantes: dto.items.map(paraEstudanteResumo),
    total: dto.total,
    page: dto.page,
    totalPaginas: Math.max(1, Math.ceil(dto.total / dto.pageSize)),
  }
}

export function paraEventoPercurso(dto: Dto<'EventoPercursoDto'>): EventoPercurso {
  return { ...dto, tipoRotulo: i18n._(TIPO_EVENTO[dto.tipo]) }
}

export function paraDocumento(dto: Dto<'DocumentoEstudanteDto'>): DocumentoEstudante {
  return {
    id: dto.id,
    designacao: dto.designacao,
    obrigatorio: dto.obrigatorio,
    estado: dto.estado,
    entregue: dto.estado === 'ENTREGUE',
  }
}

export function paraEncarregado(dto: Dto<'EncarregadoDto'>): Encarregado {
  return { ...dto }
}

/** Telefone angolano para mostrar: 923 456 789 */
// Partilhado com professores e encarregados
export { formatarTelefone } from '@/shared/lib/formatar'

export const TIPOS_OCORRENCIA = {
  DISCIPLINAR: msg`Disciplinar`,
  SAUDE: msg`Saúde`,
  PEDAGOGICA: msg`Pedagógica`,
  OUTRA: msg`Outra`,
} satisfies Record<TipoOcorrencia, unknown>

export function paraOcorrencia(dto: Dto<'OcorrenciaDto'>): Ocorrencia {
  return { ...dto, tipoRotulo: i18n._(TIPOS_OCORRENCIA[dto.tipo]) }
}
