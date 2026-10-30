import type { Dto } from '@/shared/api'
import type { DtoSis } from '@/shared/api/sis'
import { permissoesDoSis } from '@/shared/config/papeis'
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

/** Backend SIS: GET /auth/me; as permissões traduzem-se para o vocabulário da interface. */
export function paraUtilizadorDoSis(dto: DtoSis<'MeResponseDto'>): Utilizador {
  const nome = dto.name.trim() || dto.email
  return {
    id: dto.uuid,
    nome,
    primeiroNome: nome.split(' ')[0] ?? nome,
    email: dto.email,
    permissoes: permissoesDoSis(dto.permissions, dto.role),
  }
}
