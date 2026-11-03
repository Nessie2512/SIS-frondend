import { useMutation, useQueryClient } from '@tanstack/react-query'
import { administracaoKeys } from '@/entities/administracao'
import { apiSis, sisKeys } from '@/shared/api/sis'
import type { Papel } from '@/shared/config/papeis'
import { moradaParaSis, type DadosPessoa } from '@/shared/lib/pessoa'

export interface NovaConta extends DadosPessoa {
  email: string
  papel: Papel
  palavraPasse: string
}

function useRecarregar() {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: sisKeys.lista('users') })
    await qc.invalidateQueries({ queryKey: administracaoKeys.todos })
  }
}

/** Backend SIS: POST /users. O número de funcionário é atribuído pelo servidor. */
export function useCriarConta() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['utilizadores', 'criar'],
    mutationFn: async (c: NovaConta) => {
      await apiSis.POST('/users', {
        body: {
          name: c.nome.trim(),
          sex: c.sexo,
          birthDate: c.dataNascimento ?? '',
          address: moradaParaSis(c),
          nationality: c.nacionalidade.trim(),
          email: c.email.trim().toLowerCase(),
          role: c.papel,
          password: c.palavraPasse,
        },
      })
    },
    onSuccess: recarregar,
  })
}

/** Backend SIS: PATCH /users/{uuid} com o papel novo. */
export function useMudarPapel() {
  const recarregar = useRecarregar()
  return useMutation({
    mutationKey: ['utilizadores', 'papel'],
    mutationFn: async ({ utilizadorId, papel }: { utilizadorId: string; papel: Papel }) => {
      await apiSis.PATCH('/users/{uuid}', {
        params: { path: { uuid: utilizadorId } },
        body: { role: papel },
      })
    },
    onSuccess: recarregar,
  })
}
