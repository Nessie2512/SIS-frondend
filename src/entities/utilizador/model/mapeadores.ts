import type { Dto } from '@/shared/api'
import { permissoesDoPapel } from '@/shared/config/papeis'
import { lerJwt, textoDe } from '@/shared/lib/jwt'
import type { Utilizador } from './tipos'

export function paraUtilizador(dto: Dto<'MeDto'>): Utilizador {
  return {
    id: dto.id,
    nome: dto.nome,
    primeiroNome: dto.nome.split(' ')[0] ?? dto.nome,
    email: dto.email,
    permissoes: dto.permissoes,
  }
}

/**
 * Backend SIS: o login devolve só o token, por isso o utilizador lê-se das reivindicações.
 * Os nomes das reivindicações não estão documentados; aceitam-se os mais comuns até o backend
 * os fixar (ou publicar GET /auth/me). Sem nome, mostra-se a parte local do email.
 */
export function paraUtilizadorDoToken(token: string): Utilizador | null {
  const claims = lerJwt(token)
  if (!claims) return null
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null
  const email = textoDe(claims, 'email', 'username') ?? ''
  const nome = textoDe(claims, 'name', 'nome', 'fullName') ?? email.split('@')[0] ?? ''
  return {
    id: textoDe(claims, 'sub', 'uuid', 'id', 'userId') ?? email,
    nome,
    primeiroNome: nome.split(' ')[0] ?? nome,
    email,
    permissoes: permissoesDoPapel(textoDe(claims, 'role', 'papel')),
  }
}
