import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Ano lectivo em contexto (guia 2.5, 4.2): vive no cabeçalho e todas as listas o assumem.
 * Persistido porque é só um identificador, não um dado pessoal.
 */
interface EstadoContexto {
  anoLectivoId: string | null
  escolher: (id: string) => void
}

export const useContextoAno = create<EstadoContexto>()(
  persist((set) => ({ anoLectivoId: null, escolher: (id) => set({ anoLectivoId: id }) }), {
    name: 'secretaria:ano-lectivo',
  }),
)
