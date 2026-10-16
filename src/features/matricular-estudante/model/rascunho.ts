import { create } from 'zustand'
import type { DadosMatricula } from './esquema'

/**
 * Rascunho do assistente (guia 7.2): guardado em memória durante a sessão, nunca no navegador,
 * porque são dados pessoais. Sobrevive a sair e voltar ao assistente; não a recarregar a página.
 * TODO(contrato): guardar no servidor quando existir o endpoint de rascunhos (pendência do guia).
 */
interface EstadoRascunho {
  dados: DadosMatricula | null
  passo: number
  guardar: (dados: DadosMatricula, passo: number) => void
  limpar: () => void
}

export const useRascunhoMatricula = create<EstadoRascunho>()((set) => ({
  dados: null,
  passo: 0,
  guardar: (dados, passo) => set({ dados, passo }),
  limpar: () => set({ dados: null, passo: 0 }),
}))
