// Verifica o contraste dos tokens (guia 6.1 e 8.1): texto ≥ 4,5:1, componentes ≥ 3:1, em claro e escuro.
// Uso: pnpm contraste  → escreve docs/contraste.md e falha se algum par não cumprir.
import { readFileSync, writeFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/shared/styles/tokens.css', import.meta.url), 'utf8')

function lerBloco(inicio) {
  const i = css.indexOf(inicio)
  if (i < 0) throw new Error(`Bloco não encontrado: ${inicio}`)
  const fim = css.indexOf('\n}', i)
  const cores = {}
  for (const [, nome, valor] of css.slice(i, fim).matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi))
    cores[nome] = valor
  return cores
}

const claro = lerBloco('@theme {')
const escuro = { ...claro, ...lerBloco(":root[data-tema='escuro'] {") }

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const canal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}
function razao(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// [primeiro plano, fundo, mínimo, uso]
const PARES = [
  ['texto-1', 'fundo', 4.5, 'Texto principal'],
  ['texto-1', 'superficie', 4.5, 'Texto principal em cartões'],
  ['texto-2', 'fundo', 4.5, 'Texto secundário'],
  ['texto-2', 'superficie', 4.5, 'Texto secundário em cartões'],
  ['texto-3', 'fundo', 4.5, 'Legendas'],
  ['texto-3', 'superficie', 4.5, 'Legendas em cartões'],
  ['acento', 'fundo', 4.5, 'Ligações e botão discreto'],
  ['acento', 'superficie', 4.5, 'Ligações e botão discreto em cartões'],
  ['perigo', 'superficie', 4.5, 'Texto de erro'],
  ['sucesso', 'superficie', 4.5, 'Texto de sucesso'],
  ['aviso', 'superficie', 4.5, 'Texto de aviso'],
  ['sobre-acento', 'acento', 4.5, 'Texto do botão primário'],
  ['sobre-acento', 'perigo', 4.5, 'Texto do botão destrutivo'],
  ['contorno', 'superficie', 3, 'Contorno de campos e controlos'],
  ['contorno', 'fundo', 3, 'Contorno de campos sobre o fundo'],
  ['acento', 'superficie', 3, 'Anel de foco'],
]

const linhas = []
let falhas = 0
for (const [tema, cores] of [
  ['Claro', claro],
  ['Escuro', escuro],
]) {
  for (const [fg, bg, minimo, uso] of PARES) {
    if (!cores[fg] || !cores[bg]) throw new Error(`Token em falta no tema ${tema}: ${fg} ou ${bg}`)
    const r = razao(cores[fg], cores[bg])
    const ok = r >= minimo
    if (!ok) falhas++
    linhas.push(
      `| ${tema} | ${uso} | \`${fg}\` ${cores[fg]} | \`${bg}\` ${cores[bg]} | ${r.toFixed(2)}:1 | ${minimo}:1 | ${ok ? 'Cumpre' : '**Falha**'} |`,
    )
  }
}

const relatorio = `# Registo de contraste dos tokens

Gerado por \`pnpm contraste\` a partir de \`src/shared/styles/tokens.css\` (guia 6.1 e 8.1).
Não editar à mão: alterar os tokens e voltar a correr o comando.

| Tema | Uso | Primeiro plano | Fundo | Razão | Mínimo | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
${linhas.join('\n')}

\`--color-linha\` é um separador decorativo (o espaço separa antes da linha, guia 6.1) e não entra na verificação;
campos e controlos usam \`--color-contorno\`.
`

writeFileSync(new URL('../docs/contraste.md', import.meta.url), relatorio)
console.log(
  `${linhas.length - falhas}/${linhas.length} pares cumprem. Registo em docs/contraste.md`,
)
if (falhas) process.exit(1)
