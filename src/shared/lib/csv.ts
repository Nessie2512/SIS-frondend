/** Uma célula CSV com «;» como separador (o que o Excel em pt-AO espera). */
function celula(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function paraCsv(linhas: (string | number | null | undefined)[][]): string {
  return linhas.map((l) => l.map(celula).join(';')).join('\r\n')
}

/**
 * Descarrega um CSV gerado no cliente (com BOM, para o Excel ler os acentos). Só para o que já
 * está no ecrã; exportações grandes vão ao servidor como tarefa (guia 5.7).
 */
export function descarregarCsv(nome: string, linhas: (string | number | null | undefined)[][]) {
  const blob = new Blob([`\uFEFF${paraCsv(linhas)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
