import { queryOptions } from '@tanstack/react-query'
import { api, sessao, type Dto } from '@/shared/api'
import { apiSis } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraUtilizador, paraUtilizadorDoSis } from '../model/mapeadores'

export const utilizadorKeys = {
  me: ['auth', 'me'] as const,
}

/** Utilizador autenticado e permissões (guia 2.7): alimenta useCan. */
export function meQuery() {
  return queryOptions({
    queryKey: utilizadorKeys.me,
    queryFn: async ({ signal }) => {
      if (eReal('sessao')) return utilizadorDaSessao(signal)
      const { data } = await api.GET('/auth/me', { signal })
      return paraUtilizador(data!)
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Entra e guarda o token de acesso só em memória (guia 4.4). */
export async function entrar(credenciais: Dto<'LoginDto'>) {
  if (eReal('sessao')) {
    // credentials: o servidor responde com o cookie de renovação (HttpOnly)
    const { data } = await apiSis.POST('/auth/login', {
      body: { email: credenciais.email, password: credenciais.palavraPasse },
      credentials: 'include',
    })
    sessao.definirToken(data!.accessToken)
    return utilizadorDaSessao()
  }
  const { data } = await api.POST('/auth/login', { body: credenciais, credentials: 'include' })
  sessao.definirToken(data!.accessToken)
  return paraUtilizador(data!.utilizador)
}

/** Backend SIS: GET /auth/me devolve nome, email, papel e permissões. */
async function utilizadorDaSessao(signal?: AbortSignal) {
  const { data } = await apiSis.GET('/auth/me', { signal })
  sessao.definirPapel(data!.role)
  return paraUtilizadorDoSis(data!)
}

export async function sair() {
  // Anula o cookie de renovação no servidor; mesmo que falhe, a sessão local termina
  const pedido = eReal('sessao')
    ? apiSis.POST('/auth/logout', { credentials: 'include' })
    : api.POST('/auth/logout', { credentials: 'include' })
  await pedido.catch(() => undefined)
  sessao.terminar()
}

/** Na abertura da aplicação: há sessão em memória ou recupera-se pelo cookie de renovação? */
export async function garantirSessao(): Promise<boolean> {
  if (sessao.tokenAcesso()) return true
  return sessao.renovarUmaVez()
}
