import { PAGINACAO } from '@/shared/config/constantes'

/**
 * Ordenar e paginar no cliente, para os endpoints do backend SIS que devolvem a lista inteira.
 * Mesmas regras do servidor simulado: «campo» ou «-campo», nulos no fim, números por valor e
 * texto em pt com números naturais ("7.ª A" antes de "10.ª A").
 */
export function ordenarLocal<T>(lista: readonly T[], ordem: string | undefined): T[] {
  if (!ordem) return [...lista]
  const sinal = ordem.startsWith('-') ? -1 : 1
  const campo = ordem.replace(/^-/, '') as keyof T
  return [...lista].sort((a, b) => {
    const x = a[campo]
    const y = b[campo]
    if (x === y) return 0
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sinal
    return String(x).localeCompare(String(y), 'pt', { numeric: true }) * sinal
  })
}

export function paginarLocal<T>(
  lista: readonly T[],
  pagina: number,
  porPagina = PAGINACAO.porPagina,
) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const page = Math.min(Math.max(1, pagina), totalPaginas)
  return {
    itens: lista.slice((page - 1) * porPagina, page * porPagina),
    total: lista.length,
    page,
    totalPaginas,
  }
}

/** Para pesquisas: sem acentos nem maiúsculas ("João" encontra "joao"). */
export function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
