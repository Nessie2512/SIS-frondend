// shared/lib/permissoes.ts — guia 2.7: esconder o que nunca poderá fazer; desactivar com explicação o que está indisponível agora.
import { create } from 'zustand'

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
