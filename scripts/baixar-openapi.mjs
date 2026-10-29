// Descarrega o contrato OpenAPI do backend SIS para ./openapi.json (guia 4.3).
//
//   pnpm api:baixar && pnpm api:gen
//
// Por omissão, o servidor de testes; SIS_URL muda o servidor. O ficheiro fica tal como o
// servidor o publica, para o diff do Git mostrar exactamente o que o backend mudou.
import { writeFileSync } from 'node:fs'

const BASE = (process.env.SIS_URL ?? 'https://sis-backend-vp7g.onrender.com').replace(/\/$/, '')
const resposta = await fetch(`${BASE}/docs-json`, { signal: AbortSignal.timeout(120_000) })
if (!resposta.ok) {
  console.error(`O servidor respondeu ${resposta.status} em ${BASE}/docs-json`)
  process.exit(1)
}
const texto = await resposta.text()
JSON.parse(texto) // falha já se não for JSON
writeFileSync('openapi.json', texto)
console.log(`openapi.json actualizado a partir de ${BASE} (${texto.length} caracteres).`)
