import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { components } from '@/shared/api'
import type { UtilizadorSis } from '@/shared/api/sis'
import { PAPEIS, PERMISSOES_DO_PAPEL, type Papel } from '@/shared/config/papeis'
import type { AccaoAuditoria, Conta, EntradaAuditoria, EstadoUtilizador, Perfil } from './tipos'

type S = components['schemas']

export const ACCOES_AUDITORIA = {
  CRIAR: msg`Criou`,
  ALTERAR: msg`Alterou`,
  CONFIRMAR: msg`Confirmou`,
  PUBLICAR: msg`Publicou`,
  RECTIFICAR: msg`Rectificou`,
  ENTRAR: msg`Entrou`,
} as const satisfies Record<AccaoAuditoria, unknown>

const ESTADO = {
  ACTIVO: { rotulo: msg`Activo`, tom: 'sucesso' },
  INACTIVO: { rotulo: msg`Inactivo`, tom: 'neutra' },
} as const

export const rotuloEstadoUtilizador = (estado: EstadoUtilizador) => i18n._(ESTADO[estado].rotulo)

export function paraConta(dto: S['UtilizadorDto']): Conta {
  return {
    ...dto,
    estadoRotulo: rotuloEstadoUtilizador(dto.estado),
    estadoTom: ESTADO[dto.estado].tom,
  }
}

/** Aplica um novo estado sem esperar pelo servidor (mutação optimista). */
export const comEstadoConta = (conta: Conta, estado: EstadoUtilizador): Conta =>
  paraConta({ ...conta, estado })

export function paraEntradaAuditoria(dto: S['EntradaAuditoriaDto']): EntradaAuditoria {
  return { ...dto, accaoRotulo: i18n._(ACCOES_AUDITORIA[dto.accao]) }
}

/** Papéis do backend SIS com o nome que a escola usa. */
const PAPEL = {
  DIRECTOR_GERAL: {
    nome: msg`Director geral`,
    descricao: msg`Acompanha toda a escola e gere as contas.`,
  },
  DIRECTOR_PEDAGOGICO: {
    nome: msg`Director pedagógico`,
    descricao: msg`Planos curriculares, calendário e corpo docente.`,
  },
  CHEFE_SECRETARIA: {
    nome: msg`Chefe da secretaria`,
    descricao: msg`Toda a secretaria, incluindo anos lectivos, turmas e currículo.`,
  },
  SECRETARIO: { nome: msg`Secretário`, descricao: msg`Estudantes, matrículas e documentos.` },
  FINANCEIRO: { nome: msg`Financeiro`, descricao: msg`Consulta da secretaria.` },
  GESTOR_TI: { nome: msg`Gestor de TI`, descricao: msg`Contas de utilizador e auditoria.` },
  ADMIN: { nome: msg`Administrador`, descricao: msg`Acesso total.` },
} satisfies Record<Papel, unknown>

export const rotuloPapel = (papel: string) =>
  papel in PAPEL ? i18n._(PAPEL[papel as Papel].nome) : papel

/** Backend SIS: os perfis são os papéis fixos; as permissões mostradas são as da interface. */
export function perfisDoSis(utilizadores: UtilizadorSis[]): Perfil[] {
  return PAPEIS.map((papel) => ({
    id: papel,
    nome: i18n._(PAPEL[papel].nome),
    descricao: i18n._(PAPEL[papel].descricao),
    permissoes: [...PERMISSOES_DO_PAPEL[papel]],
    utilizadores: utilizadores.filter((u) => u.role === papel).length,
  }))
}

/** Backend SIS: sem registo de último acesso. */
export function paraContaDoSis(dto: UtilizadorSis): Conta {
  return paraConta({
    id: dto.uuid,
    nome: dto.name,
    email: dto.email,
    perfilId: dto.role,
    perfil: rotuloPapel(dto.role),
    estado: dto.isActive ? 'ACTIVO' : 'INACTIVO',
    ultimoAcesso: null,
  })
}
