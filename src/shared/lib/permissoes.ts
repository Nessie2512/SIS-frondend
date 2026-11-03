// shared/lib/permissoes.ts — guia 2.7: esconder o que nunca poderá fazer; desactivar com explicação o que está indisponível agora.
import { create } from 'zustand'
import { podeUsar, type Funcionalidade } from '@/shared/config/funcionalidades'

interface EstadoPermissoes {
  permissoes: ReadonlySet<string>
  carregadas: boolean
  definir: (lista: readonly string[]) => void
  limpar: () => void
}

/** Alimentado a partir de GET /auth/me (no arranque e depois de um 403). */
export const usePermissoesStore = create<EstadoPermissoes>()((set) => ({
  permissoes: new Set(),
  carregadas: false,
  definir: (lista) => set({ permissoes: new Set(lista), carregadas: true }),
  limpar: () => set({ permissoes: new Set(), carregadas: false }),
}))

export function useCan(permissao: string): boolean {
  return usePermissoesStore((estado) => estado.permissoes.has(permissao))
}

/** Pode usar esta funcionalidade agora (permissão e backend), ver shared/config/funcionalidades. */
export function usePode(funcionalidade: Funcionalidade): boolean {
  return usePermissoesStore((estado) => podeUsar(funcionalidade, estado.permissoes))
}

/** Versão sem hook, para beforeLoad das rotas e acções fora de componentes. */
export function podeAgora(funcionalidade: Funcionalidade): boolean {
  return podeUsar(funcionalidade, usePermissoesStore.getState().permissoes)
}
