/**
 * Lê as reivindicações (claims) de um JWT SEM o validar: a assinatura é verificada pelo
 * backend em cada pedido. Serve só para mostrar quem entrou e decidir o que a interface mostra.
 */
export type ReivindicacoesJwt = Record<string, unknown> & { exp?: number }

export function lerJwt(token: string): ReivindicacoesJwt | null {
  const partes = token.split('.')
  if (partes.length !== 3 || !partes[1]) return null
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const bytes = Uint8Array.from(atob(preenchido), (c) => c.charCodeAt(0))
    const corpo: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return corpo && typeof corpo === 'object' ? (corpo as ReivindicacoesJwt) : null
  } catch {
    return null
  }
}

/** Primeiro valor de texto entre várias reivindicações possíveis (o backend ainda não as documenta). */
export function textoDe(claims: ReivindicacoesJwt, ...nomes: string[]): string | undefined {
  for (const nome of nomes) {
    const valor = claims[nome]
    if (typeof valor === 'string' && valor.trim()) return valor
    if (typeof valor === 'number') return String(valor)
  }
  return undefined
}
