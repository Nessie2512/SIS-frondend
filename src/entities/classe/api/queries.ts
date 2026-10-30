import { queryOptions } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'
import { porId, referenciaSis, type ClasseSis, type NivelSis } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'

export interface Classe {
  id: string
  designacao: string
  cicloId: string
  ciclo: string
  ordem: number
  /** Inactiva: deixa de ser oferecida em matrículas e turmas novas (guia 2.4) */
  activa: boolean
}

export type Ciclo = components['schemas']['CicloDto']

export const classeKeys = { todas: ['classes'] as const, ciclos: ['classes', 'ciclos'] as const }

/** Dados de referência: frescura longa (guia 5.6). */
export function classesQuery() {
  return queryOptions({
    queryKey: classeKeys.todas,
    queryFn: async ({ signal, client }) => {
      if (eReal('curriculo')) {
        const [classes, niveis] = await Promise.all([
          client.fetchQuery(referenciaSis.classes()),
          client.fetchQuery(referenciaSis.niveis()),
        ])
        return paraClassesDoSis(classes, niveis)
      }
      const { data } = await api.GET('/classes', { signal })
      return data!
        .map((c): Classe => ({
          id: c.id,
          designacao: c.designacao,
          cicloId: c.cicloId,
          ciclo: c.cicloDesignacao,
          ordem: c.ordem,
          activa: c.estado === 'ACTIVA',
        }))
        .sort((a, b) => a.ordem - b.ordem)
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Árvore de ciclos e classes, com o uso de cada classe (turmas, matrículas, planos). */
export function ciclosQuery() {
  return queryOptions({
    queryKey: classeKeys.ciclos,
    queryFn: async ({ signal, client }) => {
      if (eReal('curriculo')) {
        const [classes, niveis, turmas] = await Promise.all([
          client.fetchQuery({ ...referenciaSis.classes(), staleTime: 0 }),
          client.fetchQuery({ ...referenciaSis.niveis(), staleTime: 0 }),
          client.fetchQuery(referenciaSis.turmas()),
        ])
        return paraCiclosDoSis(classes, niveis, turmas)
      }
      const { data } = await api.GET('/ciclos', { signal })
      return data!
    },
    staleTime: 0,
  })
}

/**
 * Backend SIS: a classe ("grade") não tem ordem. Lê-se o número do nome ("7.ª classe",
 * "PRIMARY 1"); sem número, fica depois das numeradas, pela ordem de criação (id).
 */
export function ordemDaClasse(classe: Pick<ClasseSis, 'id' | 'name'>): number {
  const numero = /(\d+)/.exec(classe.name)?.[1]
  return numero ? Number(numero) : 1000 + classe.id
}

export function paraClassesDoSis(classes: ClasseSis[], niveis: NivelSis[]): Classe[] {
  const nivelPorId = porId(niveis)
  return classes
    .map((c): Classe => {
      const nivel = nivelPorId.get(c.academicLevelId)
      return {
        id: c.uuid,
        designacao: c.name,
        cicloId: nivel?.uuid ?? '',
        ciclo: nivel?.name ?? '',
        ordem: ordemDaClasse(c),
        activa: c.isActive,
      }
    })
    .sort((a, b) => a.ordem - b.ordem)
}

/**
 * Árvore de ciclos para a gestão. Do uso de cada classe, o backend só permite contar as turmas;
 * os planos contam-se pelas disciplinas associadas e as matrículas ficam a 0 (sem endpoint).
 */
export function paraCiclosDoSis(
  classes: ClasseSis[],
  niveis: NivelSis[],
  turmas: { gradeId: number }[],
): Ciclo[] {
  const turmasPorClasse = new Map<number, number>()
  for (const t of turmas) turmasPorClasse.set(t.gradeId, (turmasPorClasse.get(t.gradeId) ?? 0) + 1)
  return [...niveis]
    .sort((a, b) => a.id - b.id)
    .map((nivel) => ({
      id: nivel.uuid,
      designacao: nivel.name,
      estado: nivel.isActive ? 'ACTIVO' : 'INACTIVO',
      classes: classes
        .filter((c) => c.academicLevelId === nivel.id)
        .sort((a, b) => ordemDaClasse(a) - ordemDaClasse(b))
        .map((c) => ({
          id: c.uuid,
          designacao: c.name,
          cicloId: nivel.uuid,
          cicloDesignacao: nivel.name,
          ordem: ordemDaClasse(c),
          estado: c.isActive ? 'ACTIVA' : 'INACTIVA',
          turmas: turmasPorClasse.get(c.id) ?? 0,
          matriculas: 0,
          planos: c.subjectIds.length ? 1 : 0,
        })),
    }))
}
