import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { components } from '@/shared/api'
import type { AccaoAuditoria, Conta, EntradaAuditoria, EstadoUtilizador } from './tipos'

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
