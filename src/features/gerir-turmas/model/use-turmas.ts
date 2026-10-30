import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paraTurma, paraTurmaDoSis, turmaKeys, type PaginaTurmas } from '@/entities/turma'
import { api, type components } from '@/shared/api'
import { apiSis, idNumerico, referenciaSis, sisKeys } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'

const PERIODO = {
  MANHA: 'MORNING',
  TARDE: 'AFTERNOON',
  NOITE: 'NIGHT',
  INTEGRAL: 'INTEGRAL',
} as const

/**
 * Backend SIS: a turma precisa de nome. Segue a regra da escola: a designação da classe sem
 * a palavra "classe" mais a letra seguinte entre as turmas dessa classe no ano ("7.ª A", "7.ª B").
 */
export function proximoNomeDeTurma(classe: string, existentes: readonly string[]): string {
  const base = classe.replace(/\s*classe\s*/i, ' ').trim()
  const usadas = new Set(existentes.map((n) => n.trim().slice(-1).toUpperCase()))
  const letra = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((l) => !usadas.has(l)) ?? 'Z'
  return `${base} ${letra}`
}

export type NovaTurma = Omit<components['schemas']['NovaTurmaDto'], 'anoLectivoId'> & {
  classeDesignacao: string
}

/**
 * Criar turma (guia 5.1): semi-optimista. A linha aparece logo na lista, com a designação a
 * carregar; se o servidor recusar, desaparece e o formulário volta com o que foi escrito.
 */
export function useCriarTurma(anoLectivoId: string) {
  const qc = useQueryClient()
  const listas = [...turmaKeys.todas, 'lista']
  return useMutation({
    mutationKey: ['turmas', 'criar'],
    mutationFn: async ({ classeDesignacao, ...dados }: NovaTurma & { chave: string }) => {
      const { chave, ...corpo } = dados
      if (eReal('turmas')) {
        // Sem sala nem lotação no backend; classe e ano vão pelo id numérico
        const [turmas, classes, anos] = await Promise.all([
          qc.fetchQuery({ ...referenciaSis.turmas(), staleTime: 0 }),
          qc.fetchQuery(referenciaSis.classes()),
          qc.fetchQuery(referenciaSis.anos()),
        ])
        const gradeId = idNumerico(classes, corpo.classeId)
        const academicYearId = idNumerico(anos, anoLectivoId)
        const irmas = turmas.filter(
          (t) => t.gradeId === gradeId && t.academicYearId === academicYearId,
        )
        const { data } = await apiSis.POST('/classes', {
          body: {
            name: proximoNomeDeTurma(
              classeDesignacao,
              irmas.map((t) => t.name),
            ),
            gradeId,
            academicYearId,
            period: PERIODO[corpo.turno],
          },
        })
        return paraTurmaDoSis(
          data!,
          classes.find((c) => c.id === gradeId),
        )
      }
      const { data } = await api.POST('/turmas', {
        params: { header: { 'Idempotency-Key': chave } },
        body: { ...corpo, anoLectivoId },
      })
      return paraTurma(data!)
    },
    onMutate: async (nova) => {
      await qc.cancelQueries({ queryKey: listas })
      const antes = qc.getQueriesData<PaginaTurmas>({ queryKey: listas })
      const provisoria = {
        ...paraTurma({
          id: 'turma-a-criar',
          designacao: '…',
          classeId: nova.classeId,
          classeDesignacao: nova.classeDesignacao,
          turno: nova.turno,
          sala: nova.sala ?? null,
          lotacaoMaxima: nova.lotacaoMaxima,
          inscritos: 0,
          estado: 'ACTIVA',
          directorTurma: null,
        }),
        aGuardar: true,
      }
      qc.setQueriesData<PaginaTurmas>({ queryKey: listas }, (p) =>
        p ? { ...p, turmas: [...p.turmas, provisoria], total: p.total + 1 } : p,
      )
      return { antes }
    },
    onError: (_e, _v, contexto) => {
      for (const [chave, dados] of contexto?.antes ?? []) qc.setQueryData(chave, dados)
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: sisKeys.lista('classes') })
      await qc.invalidateQueries({ queryKey: turmaKeys.todas })
    },
  })
}

/** Encerrar turma: pessimista, com motivo; só sem estudantes inscritos. */
export function useEncerrarTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['turmas', 'encerrar'],
    mutationFn: async ({ turmaId, motivo }: { turmaId: string; motivo: string }) => {
      if (eReal('turmas')) {
        // Backend SIS: desactivar a turma (sem motivo no contrato); a classe vem da lista
        const [{ data }, classes] = await Promise.all([
          apiSis.DELETE('/classes/{id}', { params: { path: { id: turmaId } } }),
          qc.fetchQuery(referenciaSis.classes()),
        ])
        return paraTurmaDoSis(
          data!,
          classes.find((c) => c.id === data!.gradeId),
        )
      }
      const { data } = await api.POST('/turmas/{id}/encerrar', {
        params: { path: { id: turmaId } },
        body: { motivo },
      })
      return paraTurma(data!)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: sisKeys.lista('classes') })
      await qc.invalidateQueries({ queryKey: turmaKeys.todas })
    },
  })
}
