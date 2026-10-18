// Verifica, depois do build, que nenhuma mensagem do Lingui ficou com variáveis renomeadas
// (ex.: {nome_0}). Se o React Compiler correr antes da macro, renomeia variáveis sombreadas e o
// id da mensagem deixa de existir no catálogo: em produção aparece o id em vez do texto.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const pasta = join(process.argv[2] ?? 'dist', 'assets')
const padrao = /id:`([A-Za-z0-9+/]{6})`,values:\{[^}]*\b[A-Za-z]+_\d+:/g
const falhas = []
for (const ficheiro of readdirSync(pasta).filter((f) => f.endsWith('.js'))) {
  for (const m of readFileSync(join(pasta, ficheiro), 'utf8').matchAll(padrao))
    falhas.push(`${ficheiro}: ${m[1]}`)
}
if (falhas.length) {
  console.error(`Mensagens com variáveis renomeadas (ids fora do catálogo):\n${falhas.join('\n')}`)
  process.exit(1)
}
console.log('Mensagens compiladas: todas com os ids do catálogo.')
