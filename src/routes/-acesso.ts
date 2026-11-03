import { redirect } from '@tanstack/react-router'
import type { Funcionalidade } from '@/shared/config/funcionalidades'
import { podeAgora } from '@/shared/lib/permissoes'

/**
 * Guarda das rotas (guia 2.7): quem não pode usar a área, ou a área ainda não existe no
 * servidor, volta ao início em vez de ver um ecrã que não lhe serve. Corre depois de /_app
 * ter carregado as permissões de /auth/me.
 */
export function exigir(funcionalidade: Funcionalidade) {
  if (!podeAgora(funcionalidade)) throw redirect({ to: '/', replace: true })
}
