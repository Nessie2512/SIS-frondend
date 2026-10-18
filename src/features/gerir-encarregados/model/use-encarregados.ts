import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { estudanteKeys, paraEncarregado, type Encarregado } from '@/entities/estudante'
import { api, type components } from '@/shared/api'

export type DadosEncarregado = components['schemas']['AcrescentarEncarregadoDto']

/** Pesquisa de encarregados já registados (irmãos): por nome ou telefone. */
export function pesquisaEncarregadosQuery(pesquisa: string) {
  return queryOptions({
    queryKey: ['encarregados', 'pesquisa', pesquisa],
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/encarregados', { params: { query: { pesquisa } }, signal })
      return data!
    },
    enabled: pesquisa.trim().length >= 2,
    placeholderData: keepPreviousData,
  })
}

/**
 * Acrescentar encarregado (guia 5.1): semi-optimista. O cartão aparece logo, a gravar; se o
 * servidor recusar, desaparece e a folha volta com o que foi escrito.
 */
export function useAcrescentarEncarregado(estudanteId: string) {
  const qc = useQueryClient()
  const chave = estudanteKeys.encarregados(estudanteId)
  return useMutation({
    mutationKey: ['encarregados', estudanteId, 'acrescentar'],
    mutationFn: async ({ dados }: { dados: DadosEncarregado; nome: string }) => {
      const { data } = await api.POST('/estudantes/{id}/encarregados', {
        params: { path: { id: estudanteId } },
        body: dados,
      })
      return paraEncarregado(data!)
    },
    onMutate: async ({ dados, nome }) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Encarregado[]>(chave)
      const provisorio: Encarregado = {
        id: 'enc-a-guardar',
        nome,
        parentesco: dados.parentesco ?? '',
        telefone: dados.telefone ?? '',
        email: dados.email ?? null,
        principal: dados.principal,
        outrosEducandos: 0,
        aGuardar: true,
      }
      qc.setQueryData<Encarregado[]>(chave, (l) => (l ? [...l, provisorio] : l))
      return { antes }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(chave, ctx?.antes),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}

export function useEditarEncarregado(estudanteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['encarregados', estudanteId, 'editar'],
    mutationFn: async ({ id, dados }: { id: string; dados: DadosEncarregado }) => {
      const { data } = await api.PUT('/estudantes/{id}/encarregados/{encarregadoId}', {
        params: { path: { id: estudanteId, encarregadoId: id } },
        body: dados,
      })
      return paraEncarregado(data!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: estudanteKeys.encarregados(estudanteId) }),
  })
}

/** Retirar a ligação (a pessoa continua registada): optimista, com Desfazer. */
export function useRetirarEncarregado(estudanteId: string) {
  const qc = useQueryClient()
  const chave = estudanteKeys.encarregados(estudanteId)
  return useMutation({
    mutationKey: ['encarregados', estudanteId, 'retirar'],
    scope: { id: `encarregados-${estudanteId}` },
    mutationFn: async (encarregadoId: string) => {
      await api.DELETE('/estudantes/{id}/encarregados/{encarregadoId}', {
        params: { path: { id: estudanteId, encarregadoId } },
      })
    },
    onMutate: async (encarregadoId) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Encarregado[]>(chave)
      qc.setQueryData<Encarregado[]>(chave, (l) => l?.filter((x) => x.id !== encarregadoId))
      return { antes }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(chave, ctx?.antes),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}

/** Voltar a ligar (o Desfazer de retirar). */
export function useReligarEncarregado(estudanteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: ['encarregados', estudanteId, 'religar'],
    scope: { id: `encarregados-${estudanteId}` },
    mutationFn: async ({ id, principal }: { id: string; principal: boolean }) => {
      await api.POST('/estudantes/{id}/encarregados', {
        params: { path: { id: estudanteId } },
        body: { encarregadoId: id, principal },
      })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: estudanteKeys.encarregados(estudanteId) }),
  })
}
