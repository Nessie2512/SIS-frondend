import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Preferências do utilizador neste navegador (guia 4.2: cliente persistente).
 * Só preferências de interface; nunca dados pessoais.
 */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro'
export type Densidade = 'confortavel' | 'compacta'

interface EstadoPreferencias {
  tema: PreferenciaTema
  densidade: Densidade
  /** Menu lateral só com ícones */
  menuRecolhido: boolean
  definirTema: (tema: PreferenciaTema) => void
  definirDensidade: (densidade: Densidade) => void
  definirMenuRecolhido: (recolhido: boolean) => void
}

/** A mesma chave é lida pelo script em index.html para aplicar o tema antes da primeira pintura. */
export const CHAVE_PREFERENCIAS = 'secretaria:preferencias'

export const usePreferencias = create<EstadoPreferencias>()(
  persist(
    (set) => ({
      tema: 'sistema',
      densidade: 'confortavel',
      menuRecolhido: false,
      definirTema: (tema) => set({ tema }),
      definirDensidade: (densidade) => set({ densidade }),
      definirMenuRecolhido: (menuRecolhido) => set({ menuRecolhido }),
    }),
    {
      name: CHAVE_PREFERENCIAS,
      partialize: ({ tema, densidade, menuRecolhido }) => ({ tema, densidade, menuRecolhido }),
    },
  ),
)

const consultaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)')

export function temaEfectivo(tema: PreferenciaTema): 'claro' | 'escuro' {
  if (tema !== 'sistema') return tema
  return consultaEscuro().matches ? 'escuro' : 'claro'
}

function aplicar() {
  const { tema, densidade } = usePreferencias.getState()
  const raiz = document.documentElement
  raiz.dataset.tema = temaEfectivo(tema)
  raiz.dataset.densidade = densidade
}

/**
 * Mantém data-tema e data-densidade no <html> em sincronia com a preferência
 * e com o prefers-color-scheme do sistema (guia 6.4, ponto 9).
 */
export function sincronizarPreferencias(): () => void {
  aplicar()
  const deixarDeOuvir = usePreferencias.subscribe(aplicar)
  const consulta = consultaEscuro()
  consulta.addEventListener('change', aplicar)
  return () => {
    deixarDeOuvir()
    consulta.removeEventListener('change', aplicar)
  }
}
