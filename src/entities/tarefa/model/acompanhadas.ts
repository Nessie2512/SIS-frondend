import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface EstadoAcompanhadas {
  /** Mais recentes primeiro */
  ids: string[]
  acompanhar: (id: string) => void
  dispensar: (id: string) => void
  limpar: () => void
}

/**
 * Tarefas que o utilizador lançou nesta sessão do navegador. Ficam em sessionStorage para o
 * quadro sobreviver a um recarregar; o estado de cada uma vem sempre do servidor (guia 5.7).
 */
export const useTarefasAcompanhadas = create<EstadoAcompanhadas>()(
  persist(
    (set) => ({
      ids: [],
      acompanhar: (id) => set((e) => ({ ids: [id, ...e.ids.filter((x) => x !== id)].slice(0, 8) })),
      dispensar: (id) => set((e) => ({ ids: e.ids.filter((x) => x !== id) })),
      limpar: () => set({ ids: [] }),
    }),
    { name: 'secretaria.tarefas', storage: createJSONStorage(() => sessionStorage) },
  ),
)
