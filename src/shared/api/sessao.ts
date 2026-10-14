/**
 * Sessão (guia 4.4).
 * - Token de acesso só em memória, nunca em localStorage.
 * - Token de renovação em cookie HttpOnly (exige ajuste no backend; registar em ADR).
 * - Uma única renovação em curso de cada vez; as chamadas concorrentes esperam a mesma.
 * - BroadcastChannel propaga a saída de sessão a todos os separadores.
 */

// TODO(contrato): confirmar com o backend o caminho e a resposta da renovação.
const CAMINHO_RENOVAR = '/api/v1/auth/refresh'

let tokenAcesso: string | null = null
let renovacaoEmCurso: Promise<boolean> | null = null

const canal = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('sessao')
const ouvintesSaida = new Set<() => void>()

canal?.addEventListener('message', (evento: MessageEvent<{ tipo: string }>) => {
  if (evento.data?.tipo === 'saida') terminarLocalmente()
})

function terminarLocalmente() {
  tokenAcesso = null
  ouvintesSaida.forEach((ouvinte) => ouvinte())
}

export const sessao = {
  tokenAcesso: () => tokenAcesso,

  definirToken(token: string | null) {
    tokenAcesso = token
  },

  /** Renova o token uma só vez, mesmo que várias chamadas recebam 401 ao mesmo tempo. */
  renovarUmaVez(): Promise<boolean> {
    renovacaoEmCurso ??= (async () => {
      try {
        const resposta = await fetch(CAMINHO_RENOVAR, { method: 'POST', credentials: 'include' })
        if (!resposta.ok) return false
        const corpo = (await resposta.json()) as { accessToken?: string }
        tokenAcesso = corpo.accessToken ?? null
        return tokenAcesso !== null
      } catch {
        return false
      } finally {
        renovacaoEmCurso = null
      }
    })()
    return renovacaoEmCurso
  },

  terminar() {
    terminarLocalmente()
    canal?.postMessage({ tipo: 'saida' })
  },

  /** Regista um ouvinte para a saída de sessão (neste ou noutro separador). */
  aoTerminar(ouvinte: () => void) {
    ouvintesSaida.add(ouvinte)
    return () => ouvintesSaida.delete(ouvinte)
  },
}
