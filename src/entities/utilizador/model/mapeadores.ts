import type { Dto } from '@/shared/api'
import type { DtoSis } from '@/shared/api/sis'
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

/** Backend SIS: perfil de GET /users/{uuid}; as permissões saem do papel (shared/config/papeis). */
export function paraUtilizadorDoSis(dto: DtoSis<'UserOutputDto'>): Utilizador {
  const nome = dto.name.trim() || dto.email
  return {
    id: dto.uuid,
    nome,
    primeiroNome: nome.split(' ')[0] ?? nome,
    email: dto.email,
    permissoes: permissoesDoPapel(dto.role),
  }
}

/**
 * Backend SIS: o token observado só traz `sub` e `exp` (amostras de 28/10). Lêem-se também
 * outras reivindicações comuns, para o dia em que o backend as acrescentar. Sem nome, mostra-se
 * a parte local do email.
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
