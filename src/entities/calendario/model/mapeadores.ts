import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type { Calendario, TipoEvento } from './tipos'

export const TIPOS_EVENTO = {
  FERIADO: msg`Feriado`,
  DATA_CHAVE: msg`Data-chave`,
  INTERRUPCAO: msg`Interrupção lectiva`,
  EVENTO: msg`Evento`,
} satisfies Record<TipoEvento, unknown>

export const rotuloTipoEvento = (tipo: TipoEvento) => i18n._(TIPOS_EVENTO[tipo])

export function paraEvento(dto: Dto<'EventoDto'>) {
  return { ...dto, tipoRotulo: rotuloTipoEvento(dto.tipo) }
}

export function paraCalendario(dto: Dto<'CalendarioDto'>): Calendario {
  return {
    anoLectivoId: dto.anoLectivoId,
    trimestres: dto.trimestres.map((t) => {
      const numero = t.numero
      return { ...t, rotulo: i18n._(msg`${numero}.º trimestre`) }
    }),
    eventos: dto.eventos.map(paraEvento),
  }
}
