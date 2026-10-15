import type { Dto } from '@/shared/api'
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
