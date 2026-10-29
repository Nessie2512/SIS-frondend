/** JWT de teste, sem assinatura válida: o frontend só lê as reivindicações (shared/lib/jwt). */
const parte = (objecto: object) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(objecto))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export const jwtDeTeste = (claims: object) =>
  `${parte({ alg: 'HS256', typ: 'JWT' })}.${parte(claims)}.assinatura`
