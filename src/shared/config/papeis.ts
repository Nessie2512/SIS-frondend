/**
 * Permissões da interface a partir do backend SIS (guia 2.7).
 *
 * GET /auth/me devolve `permissions` no vocabulário do backend (core/auth/permissions.ts:
 * "students:read", "academic:write"…); permissoesDoSis() traduz para o da interface
 * ("estudantes:ler", "anos:gerir"…). Isto só esconde ou desactiva o que não se pode fazer:
 * quem decide é o AccessGuard do servidor (403).
 */
export const PAPEIS = [
  'DIRECTOR_GERAL',
  'DIRECTOR_PEDAGOGICO',
  'CHEFE_SECRETARIA',
  'SECRETARIO',
  'FINANCEIRO',
  'GESTOR_TI',
  'ADMIN',
  // Docentes (o Teacher herda de utilizador): ainda sem área na secretaria
  'TEACHER',
] as const

export type Papel = (typeof PAPEIS)[number]

/** Papéis que se escolhem ao criar ou mudar uma conta: o docente nasce com o registo do professor. */
export const PAPEIS_DE_CONTA = PAPEIS.filter((p) => p !== 'TEACHER')

/** Permissões do backend (core/auth/permissions.ts). */
type PermissaoSis =
  | 'users:read'
  | 'users:write'
  | 'students:read'
  | 'students:write'
  | 'student-entry:write'
  | 'student-approval:write'
  | 'student-management:write'
  | 'classes:read'
  | 'classes:write'
  | 'academic:read'
  | 'academic:write'
  | 'curriculum:read'
  | 'curriculum:write'
  | 'finance:read'
  | 'finance:write'
  | 'reports:read'
  | 'audit:read'

/**
 * Cada permissão do backend → permissões da interface. As áreas sem endpoint no backend
 * (calendário, documentos oficiais) acompanham a leitura ou escrita da secretaria, para os
 * ecrãs abrirem e dizerem "não disponível" em vez de desaparecerem.
 */
const TRADUCAO: Record<PermissaoSis, readonly string[]> = {
  // users:* é a própria conta (GET/PATCH /users/{uuid}); gerir as contas dos outros é do
  // gestor de TI, por papel (ver PERMISSOES_POR_PAPEL)
  'users:read': [],
  'users:write': ['conta:editar'],
  'students:read': ['estudantes:ler', 'matriculas:ler', 'calendario:ler'],
  // Alterar a identidade e anular pedem student-management; aqui só o que não muda o processo
  'students:write': ['estudantes:ler', 'documentos:emitir'],
  // Criar o estudante abre o assistente de matrícula; matricular pede student-approval
  'student-entry:write': ['estudantes:ler', 'matriculas:escrever'],
  'student-approval:write': ['matriculas:ler', 'matriculas:escrever', 'matriculas:aprovar'],
  'student-management:write': ['estudantes:ler', 'estudantes:escrever'],
  'classes:read': ['turmas:ler'],
  'classes:write': ['turmas:ler', 'turmas:escrever', 'inscricoes:excepcao'],
  'academic:read': ['curriculo:ler', 'professores:ler', 'calendario:ler'],
  'academic:write': [
    'curriculo:ler',
    'curriculo:escrever',
    'professores:ler',
    'professores:escrever',
    'anos:gerir',
    'calendario:escrever',
  ],
  // Disciplinas de cada classe (GET/POST/DELETE /grades/{id}/subjects)
  'curriculum:read': ['curriculo:ler'],
  'curriculum:write': ['curriculo:ler', 'planos:escrever'],
  'finance:read': [],
  'finance:write': [],
  'reports:read': ['relatorios:ler'],
  'audit:read': ['auditoria:ler'],
}

/**
 * Rotas com @Roles no backend: o RolesGuard decide pelo papel, não pelas permissões que
 * /auth/me devolve. Acrescentam-se ao que vem do servidor.
 */
const PERMISSOES_POR_PAPEL: Partial<Record<Papel, readonly string[]>> = {
  // POST/GET/DELETE /users: só o gestor de TI cria, lista e desactiva contas
  GESTOR_TI: ['administracao:ler', 'administracao:escrever'],
  // PATCH /academic-years/{id}/activate e /close
  ADMIN: ['anos:activar'],
}

function ePermissaoSis(valor: string): valor is PermissaoSis {
  return Object.hasOwn(TRADUCAO, valor)
}

const LEITURAS_SIS: PermissaoSis[] = [
  'users:read',
  'students:read',
  'classes:read',
  'academic:read',
  'finance:read',
  'reports:read',
  'audit:read',
]

/**
 * Cópia da tabela ROLE_PERMISSIONS do backend (core/auth/permissions.ts, 02/11). Só serve
 * quando /auth/me não traz permissões reconhecidas e para o ecrã de perfis.
 */
const PERMISSOES_SIS_DO_PAPEL: Record<Papel, readonly PermissaoSis[]> = {
  DIRECTOR_GERAL: LEITURAS_SIS,
  CHEFE_SECRETARIA: [
    ...LEITURAS_SIS,
    'users:write',
    'students:write',
    'student-entry:write',
    'student-approval:write',
    'student-management:write',
    'classes:write',
    'academic:write',
    'finance:write',
  ],
  SECRETARIO: [
    'students:read',
    'classes:read',
    'students:write',
    'student-entry:write',
    'student-approval:write',
    'academic:read',
  ],
  FINANCEIRO: ['finance:read', 'finance:write', 'reports:read'],
  GESTOR_TI: ['users:read', 'users:write', 'audit:read'],
  ADMIN: ['curriculum:read', 'curriculum:write', 'academic:read'],
  DIRECTOR_PEDAGOGICO: ['curriculum:read', 'curriculum:write', 'academic:read', 'reports:read'],
  TEACHER: [],
}

const traduzir = (permissoes: readonly string[], papel?: Papel) => [
  ...new Set([
    ...permissoes.filter(ePermissaoSis).flatMap((p) => TRADUCAO[p]),
    ...((papel && PERMISSOES_POR_PAPEL[papel]) ?? []),
  ]),
]

export const PERMISSOES_DO_PAPEL: Record<Papel, readonly string[]> = {
  DIRECTOR_GERAL: traduzir(PERMISSOES_SIS_DO_PAPEL.DIRECTOR_GERAL, 'DIRECTOR_GERAL'),
  DIRECTOR_PEDAGOGICO: traduzir(PERMISSOES_SIS_DO_PAPEL.DIRECTOR_PEDAGOGICO, 'DIRECTOR_PEDAGOGICO'),
  CHEFE_SECRETARIA: traduzir(PERMISSOES_SIS_DO_PAPEL.CHEFE_SECRETARIA, 'CHEFE_SECRETARIA'),
  SECRETARIO: traduzir(PERMISSOES_SIS_DO_PAPEL.SECRETARIO, 'SECRETARIO'),
  FINANCEIRO: traduzir(PERMISSOES_SIS_DO_PAPEL.FINANCEIRO, 'FINANCEIRO'),
  GESTOR_TI: traduzir(PERMISSOES_SIS_DO_PAPEL.GESTOR_TI, 'GESTOR_TI'),
  ADMIN: traduzir(PERMISSOES_SIS_DO_PAPEL.ADMIN, 'ADMIN'),
  TEACHER: traduzir(PERMISSOES_SIS_DO_PAPEL.TEACHER, 'TEACHER'),
}

/** Só leitura da secretaria: quando não se sabe o papel de quem entrou. */
export const PERMISSOES_SO_LEITURA: readonly string[] = traduzir([
  'students:read',
  'classes:read',
  'academic:read',
])

export function ePapel(valor: unknown): valor is Papel {
  return typeof valor === 'string' && (PAPEIS as readonly string[]).includes(valor)
}

/** Papel desconhecido: nenhuma permissão; o servidor recusa o resto com 403. */
export function permissoesDoPapel(papel: string | undefined): string[] {
  return ePapel(papel) ? [...PERMISSOES_DO_PAPEL[papel]] : []
}

/**
 * Permissões do backend → permissões da interface. Nenhuma reconhecida (lista vazia ou
 * vocabulário novo) → tabela do papel, para a interface não ficar sem nada por um nome novo.
 */
export function permissoesDoSis(
  permissoes: readonly string[],
  papel: string | undefined,
): string[] {
  const doServidor = permissoes.filter(ePermissaoSis)
  if (!doServidor.length) return permissoesDoPapel(papel)
  return traduzir(doServidor, ePapel(papel) ? papel : undefined)
}
