// Orçamento de peso (guia 1.2 e 3.2): JavaScript inicial até 170 kB comprimido.
// "Inicial" = entrada + importações estáticas, lidas do manifesto do Vite (as rotas sob procura ficam de fora).
const { readFileSync, existsSync } = require('node:fs')

const caminho = 'dist/.vite/manifest.json'
if (!existsSync(caminho)) throw new Error('Corra pnpm build antes de pnpm tamanho.')
const manifesto = JSON.parse(readFileSync(caminho, 'utf8'))

const iniciais = new Set()
function visitar(chave) {
  const entrada = manifesto[chave]
  if (!entrada || iniciais.has(entrada.file)) return
  iniciais.add(entrada.file)
  for (const importacao of entrada.imports ?? []) visitar(importacao)
}
for (const [chave, entrada] of Object.entries(manifesto)) if (entrada.isEntry) visitar(chave)

module.exports = [
  {
    name: 'JavaScript inicial (brotli)',
    path: [...iniciais].map((f) => `dist/${f}`),
    limit: '170 kB',
    brotli: true,
  },
  {
    name: 'JavaScript inicial (gzip, referência)',
    path: [...iniciais].map((f) => `dist/${f}`),
    limit: '200 kB',
    gzip: true,
    brotli: false,
  },
]
