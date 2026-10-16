import { queryOptions } from '@tanstack/react-query'
import { api, sessao, type Dto } from '@/shared/api'
import { FRESCURA } from '@/shared/config/constantes'
import { paraUtilizador } from '../model/mapeadores'

export const utilizadorKeys = {
  me: ['auth', 'me'] as const,
}

/** Utilizador autenticado e permissões (guia 2.7): alimenta useCan. */
export function meQuery() {
  return queryOptions({
    queryKey: utilizadorKeys.me,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/auth/me', { signal })
      return paraUtilizador(data!)
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Entra e guarda o token de acesso só em memória (guia 4.4). */
export async function entrar(credenciais: Dto<'LoginDto'>) {
  const { data } = await api.POST('/auth/login', { body: credenciais, credentials: 'include' })
  sessao.definirToken(data!.accessToken)
  return paraUtilizador(data!.utilizador)
}

export async function sair() {
  await api.POST('/auth/logout', { credentials: 'include' }).catch(() => undefined)
  sessao.terminar()
}

/** Na abertura da aplicação: há sessão em memória ou recupera-se pelo cookie de renovação? */
export async function garantirSessao(): Promise<boolean> {
  if (sessao.tokenAcesso()) return true
  return sessao.renovarUmaVez()
}
