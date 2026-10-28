import { queryOptions } from '@tanstack/react-query'
import { api, ApiError, sessao, type Dto } from '@/shared/api'
import { apiSis } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraUtilizador, paraUtilizadorDoToken } from '../model/mapeadores'

export const utilizadorKeys = {
  me: ['auth', 'me'] as const,
}

/** Utilizador autenticado e permissões (guia 2.7): alimenta useCan. */
export function meQuery() {
  return queryOptions({
    queryKey: utilizadorKeys.me,
    queryFn: async ({ signal }) => {
      // Backend SIS: não há GET /auth/me; quem entrou e o papel vêm do próprio token
      if (eReal('sessao')) return utilizadorDaSessao()
      const { data } = await api.GET('/auth/me', { signal })
      return paraUtilizador(data!)
    },
    staleTime: FRESCURA.referencia,
  })
}

function utilizadorDaSessao() {
  const token = sessao.tokenAcesso()
  const utilizador = token ? paraUtilizadorDoToken(token) : null
  // Título técnico: a interface mostra a mensagem do estado 401, nunca este texto
  if (!utilizador) throw new ApiError(401, { title: 'SEM_SESSAO' })
  return utilizador
}

/** Entra e guarda o token de acesso só em memória (guia 4.4). */
export async function entrar(credenciais: Dto<'LoginDto'>) {
  if (eReal('sessao')) {
    const { data } = await apiSis.POST('/auth/login', {
      body: { email: credenciais.email, password: credenciais.palavraPasse },
    })
    sessao.definirToken(data!.accessToken)
    return utilizadorDaSessao()
  }
  const { data } = await api.POST('/auth/login', { body: credenciais, credentials: 'include' })
  sessao.definirToken(data!.accessToken)
  return paraUtilizador(data!.utilizador)
}

export async function sair() {
  // Backend SIS: sem logout no servidor; basta esquecer o token
  if (!eReal('sessao')) {
    await api.POST('/auth/logout', { credentials: 'include' }).catch(() => undefined)
  }
  sessao.terminar()
}

/** Na abertura da aplicação: há sessão em memória ou recupera-se pelo cookie de renovação? */
export async function garantirSessao(): Promise<boolean> {
  if (sessao.tokenAcesso()) return true
  // Backend SIS: sem renovação, recarregar a página obriga a entrar de novo (documento de lacunas)
  if (eReal('sessao')) return false
  return sessao.renovarUmaVez()
}
