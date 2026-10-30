/**
 * Permissões da interface a partir do backend SIS (guia 2.7).
 *
 * GET /auth/me devolve `permissions` no vocabulário do backend ("students:read",
 * "student-entry:write"); permissoesDoSis() traduz para o da interface ("estudantes:ler").
 * Quando nenhuma é reconhecida, vale a tabela por papel abaixo (provisória). Em qualquer caso,
 * isto só esconde ou desactiva o que não se pode fazer: quem decide é o servidor (403).
 */
export const PAPEIS = [
  'DIRECTOR_GERAL',
  'DIRECTOR_PEDAGOGICO',
  'CHEFE_SECRETARIA',
  'SECRETARIO',
  'FINANCEIRO',
  'GESTOR_TI',
  'ADMIN',
] as const

export type Papel = (typeof PAPEIS)[number]

const LEITURA = [
  'estudantes:ler',
  'matriculas:ler',
  'turmas:ler',
  'professores:ler',
  'curriculo:ler',
  'calendario:ler',
]

const SECRETARIA = [...LEITURA, 'estudantes:escrever', 'matriculas:escrever', 'documentos:emitir']

const CHEFIA = [
  ...SECRETARIA,
  'turmas:escrever',
  'inscricoes:excepcao',
  'professores:escrever',
  'curriculo:escrever',
  'calendario:escrever',
  'anos:gerir',
  'administracao:ler',
]

const ADMINISTRACAO = ['administracao:ler', 'administracao:escrever']

export const PERMISSOES_DO_PAPEL: Record<Papel, readonly string[]> = {
  DIRECTOR_GERAL: [...CHEFIA, ...ADMINISTRACAO],
  DIRECTOR_PEDAGOGICO: [
    ...LEITURA,
    'curriculo:escrever',
    'calendario:escrever',
    'professores:escrever',
  ],
  CHEFE_SECRETARIA: CHEFIA,
  SECRETARIO: SECRETARIA,
  FINANCEIRO: LEITURA,
  GESTOR_TI: [...LEITURA, ...ADMINISTRACAO],
  ADMIN: [...CHEFIA, ...ADMINISTRACAO],
}

export function ePapel(valor: unknown): valor is Papel {
  return typeof valor === 'string' && (PAPEIS as readonly string[]).includes(valor)
}

/** Papel desconhecido: só leitura mínima; o servidor recusa o resto com 403. */
export function permissoesDoPapel(papel: string | undefined): string[] {
  return ePapel(papel) ? [...new Set(PERMISSOES_DO_PAPEL[papel])] : []
}

/** Recurso do backend → área de permissões da interface. */
const AREA_DO_RECURSO: Record<string, string> = {
  students: 'estudantes',
  student: 'estudantes',
  'student-entry': 'matriculas',
  enrollments: 'matriculas',
  enrollment: 'matriculas',
  confirmations: 'matriculas',
  classes: 'turmas',
  teachers: 'professores',
  'teacher-assignments': 'professores',
  assignments: 'professores',
  grades: 'curriculo',
  subjects: 'curriculo',
  'academic-levels': 'curriculo',
  curriculum: 'curriculo',
  calendar: 'calendario',
  users: 'administracao',
  audit: 'administracao',
  'academic-years': 'anos',
  documents: 'documentos',
}

const LEITURAS = new Set(['read', 'list', 'view', 'get'])
const ESCRITAS = new Set(['write', 'create', 'update', 'delete', 'manage', 'approve'])

function traduzir(permissao: string): string[] {
  const [recurso = '', accao = ''] = permissao.trim().toLowerCase().split(':')
  if (recurso === '*' || permissao === 'all') return [...PERMISSOES_DO_PAPEL.ADMIN]
  const area = AREA_DO_RECURSO[recurso]
  if (!area) return []
  const escreve = ESCRITAS.has(accao) || accao === '*'
  const le = escreve || LEITURAS.has(accao)
  if (!le) return []
  // Áreas cujas permissões da interface não seguem o padrão ler/escrever
  if (area === 'anos') return escreve ? ['anos:gerir'] : []
  if (area === 'documentos') return escreve ? ['documentos:emitir'] : []
  const lista = [`${area}:ler`]
  if (escreve) lista.push(`${area}:escrever`)
  // A excepção à lotação não existe no backend: acompanha quem gere turmas
  if (escreve && area === 'turmas') lista.push('inscricoes:excepcao')
  return lista
}

/**
 * Permissões do backend → permissões da interface. Nenhuma reconhecida (vocabulário novo ou
 * lista vazia) → tabela do papel, para a interface não ficar sem nada por um nome desconhecido.
 */
export function permissoesDoSis(
  permissoes: readonly string[],
  papel: string | undefined,
): string[] {
  const traduzidas = permissoes.flatMap(traduzir)
  if (!traduzidas.length) return permissoesDoPapel(papel)
  return [...new Set(traduzidas)]
}
