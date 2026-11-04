import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { api, type components } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { referenciaSis } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'
import { paraAnoLectivo, paraAnoLectivoDoSis } from '../model/mapeadores'

export const anoLectivoKeys = {
  todos: ['anos-lectivos'] as const,
  encerramento: (id: string) => [...anoLectivoKeys.todos, id, 'encerramento'] as const,
  abertura: (id: string) => [...anoLectivoKeys.todos, id, 'abertura'] as const,
}

export function anosLectivosQuery() {
  return queryOptions({
    queryKey: anoLectivoKeys.todos,
    queryFn: async ({ signal, client }) => {
      if (eReal('anos')) {
        const anos = await client.fetchQuery(referenciaSis.anos())
        // Por ordem cronológica, como no contrato provisório
        return anos
          .map(paraAnoLectivoDoSis)
          .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
      }
      const { data } = await api.GET('/anos-lectivos', { signal })
      return data!.map(paraAnoLectivo)
    },
    staleTime: FRESCURA.referencia,
  })
}

export type Encerramento = components['schemas']['EncerramentoDto']
export type Abertura = components['schemas']['AberturaDto']

/** Pendências que impedem encerrar o ano (guia 2.3): sempre frescas. */
export function encerramentoQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: anoLectivoKeys.encerramento(anoLectivoId),
    queryFn: async ({ signal }): Promise<Encerramento> => {
      // Backend SIS: ainda sem rota de pendências. PATCH /academic-years/{id}/close conclui
      // as matrículas activas do ano; o ecrã explica-o em vez de mostrar pendências inventadas
      if (eReal('anos')) {
        return { anoLectivoId, pendencias: [], turmasSemResultados: [], podeEncerrar: true }
      }
      const { data } = await api.GET('/anos-lectivos/{id}/encerramento', {
        params: { path: { id: anoLectivoId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}

/** Etapas da abertura do ano, cada uma com o seu estado (guia 2.3). */
export function aberturaQuery(anoLectivoId: string) {
  return queryOptions({
    queryKey: anoLectivoKeys.abertura(anoLectivoId),
    queryFn: async ({ signal, client }): Promise<Abertura> => {
      if (eReal('anos')) return aberturaDoSis(client, anoLectivoId)
      const { data } = await api.GET('/anos-lectivos/{id}/abertura', {
        params: { path: { id: anoLectivoId } },
        signal,
      })
      return data!
    },
    staleTime: 0,
  })
}

/**
 * Backend SIS: só há o que o servidor sabe fazer. O ano está criado; as turmas e as matrículas
 * contam-se no próprio ano; activar fica por fazer até o ano estar em curso, e bloqueado
 * enquanto outro ano estiver em curso (só pode haver um). Calendário, renovação, distribuição
 * e docentes ainda não têm rotas e não aparecem como etapas.
 */
async function aberturaDoSis(client: QueryClient, anoLectivoId: string): Promise<Abertura> {
  const [anos, turmas, estudantes] = await Promise.all([
    client.fetchQuery(referenciaSis.anos()),
    client.fetchQuery(referenciaSis.turmas(anoLectivoId)),
    client.fetchQuery(referenciaSis.estudantes(anoLectivoId)),
  ])
  const emCurso = anos.find((a) => a.isActive && !a.isClosed && a.uuid !== anoLectivoId)
  const ano = anos.find((a) => a.uuid === anoLectivoId)
  const doAno = turmas.filter((t) => t.academicYearId === ano?.id)
  return {
    anoLectivoId,
    anoEmCurso: emCurso?.label ?? null,
    etapas: [
      { id: 'CRIAR', estado: 'FEITA', quantidade: null },
      { id: 'TURMAS', estado: doAno.length ? 'FEITA' : 'POR_FAZER', quantidade: doAno.length },
      { id: 'MATRICULAS', estado: 'OPCIONAL', quantidade: estudantes.length },
      {
        id: 'ACTIVAR',
        estado: ano?.isActive ? 'FEITA' : emCurso ? 'BLOQUEADA' : 'POR_FAZER',
        quantidade: null,
      },
    ],
  }
}
