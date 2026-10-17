import type { FiltrosVista } from './tipos'

/** Chaves do URL que não fazem parte de uma vista: página e item aberto no painel. */
const FORA_DA_VISTA = new Set(['page', 'estudante', 'turma', 'professor', 'separador'])

/** Só os filtros com valor, sem página nem selecção, para guardar e comparar vistas. */
export function filtrosDaVista(pesquisa: Record<string, unknown>): FiltrosVista {
  const filtros: FiltrosVista = {}
  for (const [chave, valor] of Object.entries(pesquisa)) {
    if (FORA_DA_VISTA.has(chave) || valor === undefined || valor === null || valor === '') continue
    if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
      filtros[chave] = valor
    }
  }
  return filtros
}

export function mesmosFiltros(a: FiltrosVista, b: FiltrosVista) {
  const chavesA = Object.keys(a)
  return chavesA.length === Object.keys(b).length && chavesA.every((k) => a[k] === b[k])
}
