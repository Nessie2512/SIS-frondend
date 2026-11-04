import { queryOptions } from '@tanstack/react-query'
import { api } from '@/shared/api'
import { referenciaSis, type DisciplinaSis } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import type { Disciplina } from '../model/tipos'

export const disciplinaKeys = { todas: ['disciplinas'] as const }

/** Dados de referência: frescura longa (guia 5.6). */
export function disciplinasQuery(anoLectivoId = '') {
  return queryOptions({
    queryKey: [...disciplinaKeys.todas, anoLectivoId] as const,
    queryFn: async ({ signal, client }): Promise<Disciplina[]> => {
      if (eReal('curriculo')) {
        const anos = await client.fetchQuery(referenciaSis.anos())
        const ano = anos.find((a) => a.uuid === anoLectivoId) ?? anos.find((a) => a.isActive)
        if (!ano)
          throw new Error('Não existe um ano letivo disponível para consultar as disciplinas.')
        const [disciplinas, classes] = await Promise.all([
          client.fetchQuery(referenciaSis.disciplinas(ano.uuid)),
          client.fetchQuery(referenciaSis.classes(ano.uuid)),
        ])
        return paraDisciplinasDoSis(disciplinas, classes)
      }
      const { data } = await api.GET('/disciplinas', { signal })
      return data!.map((d) => ({ ...d, activa: d.estado === 'ACTIVA' }))
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Backend SIS: "em uso" = associada a alguma classe (não se elimina, só se inactiva). */
export function paraDisciplinasDoSis(
  disciplinas: DisciplinaSis[],
  classes: { subjectIds: number[] }[],
): Disciplina[] {
  const usadas = new Set(classes.flatMap((c) => c.subjectIds))
  return disciplinas
    .map((d): Disciplina => ({
      id: d.uuid,
      nome: d.name,
      sigla: d.code,
      estado: d.isActive ? 'ACTIVA' : 'INACTIVA',
      activa: d.isActive,
      emUso: usadas.has(d.id),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}
