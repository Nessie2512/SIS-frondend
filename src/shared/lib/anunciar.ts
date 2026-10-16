import { create } from 'zustand'

/**
 * Anúncios para leitores de ecrã (guia 8.1): mudanças optimistas anunciam-se de forma educada
 * ("Estudante movido para 10.ª A"); reversões e erros de forma assertiva, com o motivo.
 */
interface EstadoAnuncios {
  educado: string
  assertivo: string
}

export const useAnuncios = create<EstadoAnuncios>()(() => ({ educado: '', assertivo: '' }))

let contador = 0
function publicar(campo: keyof EstadoAnuncios, mensagem: string) {
  // Alterna um espaço invisível para o mesmo texto voltar a ser lido
  contador++
  useAnuncios.setState({ [campo]: mensagem + (contador % 2 ? '​' : '') })
}

export const anunciar = {
  educado: (mensagem: string) => publicar('educado', mensagem),
  assertivo: (mensagem: string) => publicar('assertivo', mensagem),
}
