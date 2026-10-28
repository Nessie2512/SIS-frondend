// Recolhe amostras das respostas reais do backend SIS, para acertar os mapeadores do frontend.
//
//   node scripts/amostras-api.mjs            (servidor de testes por omissão)
//   SIS_URL=https://outro-servidor node scripts/amostras-api.mjs
//
// Pede o email e a palavra-passe no terminal (a palavra-passe não aparece nem fica guardada).
// Só faz leituras (GET) e dois pedidos inválidos de propósito, para ver o formato dos erros:
// não cria nem altera nada. Grava em amostras-api/, que o .gitignore deixa fora do repositório
// (há dados pessoais de teste nas respostas). O token nunca é gravado: só as claims do JWT.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const BASE = (process.env.SIS_URL ?? 'https://sis-backend-vp7g.onrender.com').replace(/\/$/, '')
const PASTA = 'amostras-api'
const MAXIMO_POR_LISTA = 5

function perguntar(texto, { esconder = false } = {}) {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (esconder) {
      // Não ecoa o que se escreve (palavra-passe)
      rl._writeToOutput = (s) => {
        if (s.includes(texto)) rl.output.write(s)
      }
    }
    rl.question(texto, (resposta) => {
      rl.close()
      if (esconder) process.stdout.write('\n')
      resolver(resposta.trim())
    })
  })
}

async function pedir(metodo, caminho, { token, corpo } = {}) {
  const inicio = Date.now()
  const resposta = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(120_000), // o Render gratuito pode demorar a acordar
  })
  const texto = await resposta.text()
  let json
  try {
    json = JSON.parse(texto)
  } catch {
    json = texto.slice(0, 2000)
  }
  return {
    pedido: `${metodo} ${caminho}`,
    estado: resposta.status,
    tipo: resposta.headers.get('content-type'),
    ms: Date.now() - inicio,
    corpo: json,
  }
}

/** Listas: guarda só as primeiras, com o total, para o ficheiro não crescer sem fim. */
function cortar(corpo) {
  const lista = Array.isArray(corpo) ? corpo : Array.isArray(corpo?.data) ? corpo.data : null
  if (!lista) return corpo
  const primeiras = lista.slice(0, MAXIMO_POR_LISTA)
  const cortada = Array.isArray(corpo) ? primeiras : { ...corpo, data: primeiras }
  return { _total: lista.length, _mostradas: primeiras.length, corpo: cortada }
}

function primeiroId(corpo, ...campos) {
  const lista = Array.isArray(corpo) ? corpo : Array.isArray(corpo?.data) ? corpo.data : []
  const item = lista[0]
  if (!item) return undefined
  for (const c of campos) if (item[c] !== undefined && item[c] !== null) return item[c]
  return undefined
}

function gravar(nome, conteudo) {
  writeFileSync(join(PASTA, `${nome}.json`), JSON.stringify(conteudo, null, 2) + '\n')
  const estado = conteudo?.estado ?? ''
  console.log(`  ${String(estado).padEnd(4)} ${nome}`)
}

mkdirSync(PASTA, { recursive: true })
console.log(`Servidor: ${BASE}\n`)
const email = await perguntar('Email: ')
const password = await perguntar('Palavra-passe: ', { esconder: true })

console.log('\nA entrar (a primeira resposta pode demorar se o servidor estiver a dormir)...')
const login = await pedir('POST', '/auth/login', { corpo: { email, password } })
const token = login.corpo?.accessToken ?? login.corpo?.data?.accessToken
gravar('auth-login', {
  ...login,
  corpo: JSON.parse(JSON.stringify(login.corpo).replaceAll(token ?? '\u0000', '<redigido>')),
})
if (!token) {
  console.error('\nNão foi possível entrar. Veja amostras-api/auth-login.json.')
  process.exit(1)
}
// Só as claims (cabeçalho e conteúdo); a assinatura não se grava
const [cabecalho, conteudo] = token.split('.').slice(0, 2)
const decodificar = (parte) => JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'))
gravar('jwt-claims', { cabecalho: decodificar(cabecalho), claims: decodificar(conteudo) })

const listas = {
  'anos-lectivos': '/academic-years',
  ciclos: '/academic-levels',
  classes: '/grades',
  disciplinas: '/subjects',
  turmas: '/classes',
  estudantes: '/students',
  professores: '/teachers',
  utilizadores: '/users',
}
const corpos = {}
for (const [nome, caminho] of Object.entries(listas)) {
  const r = await pedir('GET', caminho, { token })
  corpos[nome] = r.corpo
  gravar(nome, { ...r, corpo: cortar(r.corpo) })
}

// Um registo de cada, pelo identificador que a lista devolver
const detalhes = [
  ['ano-lectivo', '/academic-years/', corpos['anos-lectivos'], ['uuid', 'id']],
  ['ciclo', '/academic-levels/', corpos.ciclos, ['id', 'uuid']],
  ['classe', '/grades/', corpos.classes, ['id', 'uuid']],
  ['disciplina', '/subjects/', corpos.disciplinas, ['id', 'uuid']],
  ['estudante', '/students/', corpos.estudantes, ['uuid', 'id']],
  ['professor', '/teachers/', corpos.professores, ['uuid', 'id']],
  ['utilizador', '/users/', corpos.utilizadores, ['uuid', 'id']],
]
for (const [nome, prefixo, lista, campos] of detalhes) {
  const id = primeiroId(lista, ...campos)
  if (id === undefined) continue
  gravar(nome, await pedir('GET', prefixo + encodeURIComponent(id), { token }))
}
const professor = primeiroId(corpos.professores, 'uuid', 'id')
if (professor !== undefined)
  gravar(
    'professor-atribuicoes',
    await pedir('GET', `/teachers/${professor}/assignments`, { token }),
  )

// Relatórios: o ano lectivo pede um id numérico; tenta-se com o primeiro que aparecer
const anoNumerico = primeiroId(corpos['anos-lectivos'], 'id', 'numericId') ?? 1
gravar(
  'relatorio-estudantes-ano',
  await pedir('GET', `/students/reports/year/female?academicYearId=${anoNumerico}`, { token }),
)

// Formato dos erros: pedidos inválidos de propósito (não criam nada)
gravar('erro-validacao-classe', await pedir('POST', '/grades', { token, corpo: {} }))
gravar('erro-validacao-matricula', await pedir('POST', '/students/enroll', { token, corpo: {} }))
gravar(
  'erro-nao-encontrado',
  await pedir('GET', '/students/00000000-0000-0000-0000-000000000000', { token }),
)
gravar('erro-sem-token', await pedir('GET', '/academic-years'))

console.log(`\nFeito. As amostras estão em ${PASTA}/ (fora do Git).`)
