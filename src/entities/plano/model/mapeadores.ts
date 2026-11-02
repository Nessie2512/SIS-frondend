import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Dto } from '@/shared/api'
import type { EstadoPlano, LinhaPlano, Plano, PlanoResumo } from './tipos'

const ESTADO = {
  RASCUNHO: { rotulo: msg`Rascunho`, tom: 'accao' },
  VIGENTE: { rotulo: msg`Vigente`, tom: 'sucesso' },
  ARQUIVADO: { rotulo: msg`Arquivado`, tom: 'neutra' },
} as const satisfies Record<EstadoPlano, { rotulo: unknown; tom: PlanoResumo['estadoTom'] }>

export function paraPlanoResumo(dto: Dto<'PlanoResumoDto'>): PlanoResumo {
  return {
    id: dto.id,
    classeId: dto.classeId,
    versao: dto.versao,
    estado: dto.estado,
    estadoRotulo: i18n._(ESTADO[dto.estado].rotulo),
    estadoTom: ESTADO[dto.estado].tom,
    editavel: dto.estado === 'RASCUNHO',
    publicadoEm: dto.publicadoEm,
    totalHoras: dto.totalHoras,
  }
}

/** Recalcula o total depois de uma alteração local (mutações optimistas). */
export function comLinhas(plano: Plano, linhas: LinhaPlano[]): Plano {
  return {
    ...plano,
    linhas: [...linhas].sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt')),
    totalHoras: linhas.reduce((soma, l) => soma + l.horasSemanais, 0),
  }
}

export function paraPlano(dto: Dto<'PlanoDto'>): Plano {
  return {
    ...paraPlanoResumo(dto),
    linhas: dto.linhas.map((l) => ({ ...l })),
    revisao: dto.revisao,
  }
}

/** Backend SIS: um único plano por classe (id = uuid da classe), sempre em vigor. */
export function planoResumoDoSis(classeId: string): PlanoResumo {
  return {
    id: classeId,
    classeId,
    versao: 1,
    estado: 'VIGENTE',
    estadoRotulo: i18n._(ESTADO.VIGENTE.rotulo),
    estadoTom: ESTADO.VIGENTE.tom,
    // Edita-se directamente: não há rascunho nem publicação no backend
    editavel: true,
    publicadoEm: null,
    totalHoras: 0,
  }
}

export function planoDoSis(
  classeId: string,
  disciplinas: { uuid: string; name: string; code: string }[],
): Plano {
  return comLinhas(
    {
      ...planoResumoDoSis(classeId),
      linhas: [],
      revisao: '',
      semCargaHoraria: true,
    },
    disciplinas.map((d) => ({
      disciplinaId: d.uuid,
      disciplina: d.name,
      sigla: d.code,
      horasSemanais: 0,
    })),
  )
}
