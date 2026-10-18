import * as z from 'zod'

/**
 * Análise do CSV de importação (guia 5.6): corre num Web Worker para não bloquear o ecrã com
 * ficheiros grandes. É código puro, sem DOM nem i18n, para correr dos dois lados: devolve
 * códigos de erro, e o ecrã traduz-os.
 */

export const COLUNAS = [
  'nome',
  'sexo',
  'data_nascimento',
  'bilhete',
  'classe',
  'encarregado',
  'parentesco',
  'telefone',
] as const

// Dados de exemplo do modelo, não texto da interface
/* eslint-disable lingui/no-unlocalized-strings */
export const MODELO_CSV = [
  COLUNAS.join(';'),
  'Ana Maria Domingos;F;14/03/2014;004512345LA041;7.ª classe;Rosa Domingos;Mãe;923 456 789',
  'Pedro Afonso Neto;M;2013-09-02;;8.ª classe;Afonso Neto;Pai;912345678',
].join('\r\n')
/* eslint-enable lingui/no-unlocalized-strings */

export interface ClasseConhecida {
  id: string
  designacao: string
}

export interface LinhaValida {
  linha: number
  nome: string
  sexo: 'M' | 'F'
  /** AAAA-MM-DD */
  dataNascimento: string
  documentoIdentificacao: string | null
  classeId: string
  classe: string
  encarregado: { nome: string; parentesco: string; telefone: string }
}

export type CodigoErroLinha =
  | 'FALTA_NOME'
  | 'NOME_INCOMPLETO'
  | 'SEXO_INVALIDO'
  | 'FALTA_DATA'
  | 'DATA_INVALIDA'
  | 'IDADE_FORA'
  | 'BILHETE_INVALIDO'
  | 'FALTA_CLASSE'
  | 'CLASSE_DESCONHECIDA'
  | 'FALTA_ENCARREGADO'
  | 'TELEFONE_INVALIDO'
  | 'LINHA_REPETIDA'

export interface ErroLinha {
  linha: number
  campo: string
  codigo: CodigoErroLinha
  /** CLASSE_DESCONHECIDA: a classe escrita; LINHA_REPETIDA: a linha repetida */
  valor?: string
}

export type ErroFicheiro =
  | { codigo: 'VAZIO' }
  | { codigo: 'SO_CABECALHO' }
  | { codigo: 'COLUNAS_EM_FALTA'; colunas: string[] }

export interface Analise {
  validas: LinhaValida[]
  erros: ErroLinha[]
  /** Linhas com dados (sem o cabeçalho e sem linhas em branco) */
  total: number
  /** Erro que impede ler o ficheiro (cabeçalho errado, vazio) */
  erroFicheiro: ErroFicheiro | null
}

/** Separa uma linha CSV com aspas e com «;» ou «,» como separador. */
function partirLinha(linha: string, separador: string): string[] {
  const campos: string[] = []
  let actual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]
    if (aspas) {
      if (ch === '"' && linha[i + 1] === '"') {
        actual += '"'
        i++
      } else if (ch === '"') aspas = false
      else actual += ch
    } else if (ch === '"') aspas = true
    else if (ch === separador) {
      campos.push(actual)
      actual = ''
    } else actual += ch
  }
  campos.push(actual)
  return campos.map((c) => c.trim())
}

const semAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

function lerData(texto: string): string | null {
  const pt = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  const [a, m, d] = pt
    ? [Number(pt[3]), Number(pt[2]), Number(pt[1])]
    : iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : [0, 0, 0]
  if (!a) return null
  const data = new Date(Date.UTC(a, m - 1, d))
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d)
    return null
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** «7», «7.ª», «7ª classe» ou «7.ª classe» correspondem à mesma classe. */
function lerClasse(texto: string, classes: ClasseConhecida[]) {
  const numero = /^(\d{1,2})/.exec(texto.trim())?.[1]
  return classes.find(
    (c) =>
      semAcentos(c.designacao) === semAcentos(texto) ||
      (numero !== undefined && /^(\d{1,2})/.exec(c.designacao)?.[1] === numero),
  )
}

const esquemaLinha = (hoje: Date) =>
  z.object({
    nome: z
      .string()
      .min(1, 'FALTA_NOME')
      .refine((v) => v.split(/\s+/).length >= 2, 'NOME_INCOMPLETO'),
    sexo: z
      .string()
      .transform((v) => v.toUpperCase())
      .pipe(z.enum(['M', 'F'], { error: 'SEXO_INVALIDO' })),
    data_nascimento: z
      .string()
      .min(1, 'FALTA_DATA')
      .transform((v, ctx) => {
        const iso = lerData(v)
        if (!iso) {
          ctx.addIssue({ code: 'custom', message: 'DATA_INVALIDA' })
          return z.NEVER
        }
        const idade = hoje.getUTCFullYear() - Number(iso.slice(0, 4))
        if (idade < 4 || idade > 30) {
          ctx.addIssue({ code: 'custom', message: 'IDADE_FORA' })
          return z.NEVER
        }
        return iso
      }),
    bilhete: z
      .string()
      .transform((v) => v.replace(/\s/g, '').toUpperCase())
      .refine((v) => !v || /^\d{9}[A-Z]{2}\d{3}$/.test(v), 'BILHETE_INVALIDO'),
    classe: z.string().min(1, 'FALTA_CLASSE'),
    encarregado: z.string().min(1, 'FALTA_ENCARREGADO'),
    parentesco: z.string(),
    telefone: z
      .string()
      .transform((v) => v.replace(/[\s.-]/g, '').replace(/^(\+|00)?244/, ''))
      .refine((v) => /^9\d{8}$/.test(v), 'TELEFONE_INVALIDO'),
  })

export function analisarCsv(texto: string, classes: ClasseConhecida[], hoje = new Date()): Analise {
  const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/)
  const cabecalho = linhas[0] ?? ''
  const separador = cabecalho.includes(';') ? ';' : ','
  const colunas = partirLinha(cabecalho, separador).map(semAcentos)
  const vazio = { validas: [], erros: [], total: 0 }
  if (!cabecalho.trim()) return { ...vazio, erroFicheiro: { codigo: 'VAZIO' } }
  const emFalta = COLUNAS.filter((c) => !colunas.includes(c))
  if (emFalta.length) {
    return {
      ...vazio,
      erroFicheiro: { codigo: 'COLUNAS_EM_FALTA', colunas: [...emFalta] },
    }
  }

  const esquema = esquemaLinha(hoje)
  const validas: LinhaValida[] = []
  const erros: ErroLinha[] = []
  const vistos = new Map<string, number>()
  let total = 0
  linhas.slice(1).forEach((bruta, i) => {
    if (!bruta.trim()) return
    total++
    const linha = i + 2 // a linha 1 é o cabeçalho
    const campos = partirLinha(bruta, separador)
    const registo = Object.fromEntries(COLUNAS.map((c) => [c, campos[colunas.indexOf(c)] ?? '']))
    const r = esquema.safeParse(registo)
    const errosLinha: ErroLinha[] = r.success
      ? []
      : r.error.issues.map((x) => ({
          linha,
          campo: String(x.path[0] ?? ''),
          codigo: x.message as CodigoErroLinha,
        }))
    const classe = registo.classe ? lerClasse(registo.classe, classes) : undefined
    if (registo.classe && !classe) {
      erros.push({ linha, campo: 'classe', codigo: 'CLASSE_DESCONHECIDA', valor: registo.classe })
    }
    if (r.success) {
      const chave = `${semAcentos(r.data.nome)}|${r.data.data_nascimento}`
      const repetida = vistos.get(chave)
      if (repetida) {
        errosLinha.push({
          linha,
          campo: 'nome',
          codigo: 'LINHA_REPETIDA',
          valor: String(repetida),
        })
      } else vistos.set(chave, linha)
    }
    erros.push(...errosLinha)
    if (r.success && classe && !errosLinha.length) {
      validas.push({
        linha,
        nome: r.data.nome.replace(/\s+/g, ' '),
        sexo: r.data.sexo,
        dataNascimento: r.data.data_nascimento,
        documentoIdentificacao: r.data.bilhete || null,
        classeId: classe.id,
        classe: classe.designacao,
        encarregado: {
          nome: r.data.encarregado,
          parentesco: r.data.parentesco,
          telefone: r.data.telefone,
        },
      })
    }
  })
  erros.sort((a, b) => a.linha - b.linha)
  if (!total) return { ...vazio, erroFicheiro: { codigo: 'SO_CABECALHO' } }
  return { validas, erros, total, erroFicheiro: null }
}
