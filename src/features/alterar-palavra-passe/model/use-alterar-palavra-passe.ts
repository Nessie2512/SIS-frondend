import { useMutation } from '@tanstack/react-query'
import { apiSis } from '@/shared/api/sis'

/**
 * A própria conta (guia de integração, 4): cada utilizador altera a sua palavra-passe com
 * PATCH /users/{uuid}, o uuid que GET /auth/me devolve. O papel não se muda aqui.
 */
export function useAlterarPalavraPasse(utilizadorId: string) {
  return useMutation({
    mutationKey: ['conta', utilizadorId, 'palavra-passe'],
    mutationFn: async (password: string) => {
      await apiSis.PATCH('/users/{uuid}', {
        params: { path: { uuid: utilizadorId } },
        body: { password },
      })
    },
  })
}
