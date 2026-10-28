/**
 * Sessão (guia 4.4).
 * - Token de acesso só em memória, nunca em localStorage.
 * - Token de renovação em cookie HttpOnly (exige ajuste no backend; registar em ADR).
 * - Uma única renovação em curso de cada vez; as chamadas concorrentes esperam a mesma.
 * - BroadcastChannel propaga a saída de sessão a todos os separadores.
 */

import { eReal } from '@/shared/config/ligacao'

// TODO(contrato): confirmar com o backend o caminho e a resposta da renovação (ADR 0001).
const caminhoRenovar = () => new URL('/api/v1/auth/refresh', window.location.origin).href

let tokenAcesso: string | null = null
let renovacaoEmCurso: Promise<boolean> | null = null

const canal = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('sessao')
const ouvintesSaida = new Set<(motivo: MotivoFimSessao) => void>()

/** 'saida': o utilizador saiu (aqui ou noutro separador); 'expirada': a renovação falhou a meio do trabalho. */
export type MotivoFimSessao = 'saida' | 'expirada'

canal?.addEventListener('message', (evento: MessageEvent<{ tipo: string }>) => {
  if (evento.data?.tipo === 'saida') terminarLocalmente('saida')
})

function terminarLocalmente(motivo: MotivoFimSessao) {
  tokenAcesso = null
  ouvintesSaida.forEach((ouvinte) => ouvinte(motivo))
}

export const sessao = {
  tokenAcesso: () => tokenAcesso,

  definirToken(token: string | null) {
    tokenAcesso = token
  },

  /** Renova o token uma só vez, mesmo que várias chamadas recebam 401 ao mesmo tempo. */
  renovarUmaVez(): Promise<boolean> {
    // O backend SIS não tem renovação: não vale a pena pedir ao /api/v1
    if (eReal('sessao')) return Promise.resolve(false)
    renovacaoEmCurso ??= (async () => {
      try {
        const resposta = await fetch(caminhoRenovar(), { method: 'POST', credentials: 'include' })
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

  terminar(motivo: MotivoFimSessao = 'saida') {
    terminarLocalmente(motivo)
    // Só a saída voluntária fecha os outros separadores; a expiração resolve-se em cada um
    if (motivo === 'saida') canal?.postMessage({ tipo: 'saida' })
  },

  /** Regista um ouvinte para a saída de sessão (neste ou noutro separador). */
  aoTerminar(ouvinte: (motivo: MotivoFimSessao) => void) {
    ouvintesSaida.add(ouvinte)
    return () => void ouvintesSaida.delete(ouvinte)
  },
}

/** Avisos da camada HTTP para a aplicação, sem a camada HTTP conhecer o React Query. */
const ouvintesPermissao = new Set<() => void>()
export const eventosApi = {
  /** Um pedido devolveu 403: as permissões em memória estão desactualizadas (guia 2.6, 4.4). */
  aoPermissaoNegada(ouvinte: () => void) {
    ouvintesPermissao.add(ouvinte)
    return () => void ouvintesPermissao.delete(ouvinte)
  },
  emitirPermissaoNegada() {
    ouvintesPermissao.forEach((ouvinte) => ouvinte())
  },
}
