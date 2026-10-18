import type { FieldErrors, FieldValues } from 'react-hook-form'

export interface ErroResumo {
  /** Caminho do campo no formulário (ex.: «encarregados.0.telefone») */
  campo: string
  rotulo: string
  mensagem: string
}

/**
 * Achata os erros do React Hook Form (campos aninhados e listas) para o resumo de erros, pela
 * ordem em que aparecem no formulário. `rotuloDe` dá a etiqueta visível de cada campo; campos
 * sem etiqueta conhecida e o erro de raiz (servidor) ficam de fora.
 */
export function errosDoFormulario<T extends FieldValues>(
  erros: FieldErrors<T>,
  rotuloDe: (campo: string) => string | undefined,
  dentroDe?: readonly string[],
): ErroResumo[] {
  const saida: ErroResumo[] = []
  function visitar(no: unknown, caminho: string) {
    if (!no || typeof no !== 'object') return
    const registo = no as Record<string, unknown>
    if (typeof registo.message === 'string' && registo.message) {
      const rotulo = rotuloDe(caminho)
      if (rotulo) saida.push({ campo: caminho, rotulo, mensagem: registo.message })
      return
    }
    for (const [chave, filho] of Object.entries(registo)) {
      if (chave === 'ref' || chave === 'type') continue
      // A raiz do formulário é o erro do servidor (mostrado à parte); a de uma lista é dela
      if (chave === 'root' && !caminho) continue
      visitar(filho, chave === 'root' ? caminho : caminho ? `${caminho}.${chave}` : chave)
    }
  }
  visitar(erros, '')
  return dentroDe
    ? saida.filter((e) => dentroDe.some((c) => e.campo === c || e.campo.startsWith(`${c}.`)))
    : saida
}
