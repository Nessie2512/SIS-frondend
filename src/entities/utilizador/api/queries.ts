import { queryOptions } from '@tanstack/react-query'
import { api, ApiError, sessao, type Dto } from '@/shared/api'
import { apiSis, SEM_AVISO_403 } from '@/shared/api/sis'
import { FRESCURA } from '@/shared/config/constantes'
import { eReal } from '@/shared/config/ligacao'
import { paraUtilizador, paraUtilizadorDoSis, paraUtilizadorDoToken } from '../model/mapeadores'

export const utilizadorKeys = {
  me: ['auth', 'me'] as const,
}

/** Utilizador autenticado e permissões (guia 2.7): alimenta useCan. */
export function meQuery() {
  return queryOptions({
    queryKey: utilizadorKeys.me,
    queryFn: async ({ signal }) => {
      // Backend SIS: não há GET /auth/me (ver utilizadorDaSessao)
      if (eReal('sessao')) return utilizadorDaSessao(signal)
      const { data } = await api.GET('/auth/me', { signal })
      return paraUtilizador(data!)
    },
    staleTime: FRESCURA.referencia,
  })
}

/** Email escrito na entrada: o token do SIS não o traz e o perfil pode não estar acessível. */
let emailDaEntrada = ''

/**
 * Backend SIS: o token só traz `sub` (uuid do utilizador) e `exp`. Nome, email e papel vêm de
 * GET /users/{sub}. Se o papel não puder ler utilizadores (403), entra-se sem permissões de
 * escrita na interface; o servidor continua a decidir cada pedido.
 */
async function utilizadorDaSessao(signal?: AbortSignal) {
  const token = sessao.tokenAcesso()
  const doToken = token ? paraUtilizadorDoToken(token) : null
  // Título técnico: a interface mostra a mensagem do estado 401, nunca este texto
  if (!doToken) throw new ApiError(401, { title: 'SEM_SESSAO' })

  try {
    const { data } = await apiSis.GET('/users/{uuid}', {
      params: { path: { uuid: doToken.id } },
      headers: { [SEM_AVISO_403]: '1' },
      signal,
    })
    sessao.definirPapel(data!.role)
    return paraUtilizadorDoSis(data!)
  } catch (erro) {
    if (!(erro instanceof ApiError) || (erro.status !== 403 && erro.status !== 404)) throw erro
    sessao.definirPapel(null)
    return { ...doToken, email: doToken.email || emailDaEntrada }
  }
}

/** Entra e guarda o token de acesso só em memória (guia 4.4). */
export async function entrar(credenciais: Dto<'LoginDto'>) {
  if (eReal('sessao')) {
    const { data } = await apiSis.POST('/auth/login', {
      body: { email: credenciais.email, password: credenciais.palavraPasse },
    })
    sessao.definirToken(data!.accessToken)
    emailDaEntrada = credenciais.email.trim().toLowerCase()
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
