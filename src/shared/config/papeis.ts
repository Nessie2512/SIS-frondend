/**
 * Papéis do backend SIS → permissões da interface (guia 2.7).
 *
 * ⚠️ PROVISÓRIO: o backend decide por papel e não publica as permissões. Esta tabela só
 * esconde ou desactiva o que o papel não pode fazer; quem decide é sempre o servidor (403).
 * Pedido ao backend: devolver as permissões no token ou num GET /auth/me (documento de lacunas).
 */
export const PAPEIS = [
  'DIRECTOR_GERAL',
  'CHEFE_SECRETARIA',
  'SECRETARIO',
  'FINANCEIRO',
  'GESTOR_TI',
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
  CHEFE_SECRETARIA: CHEFIA,
  SECRETARIO: SECRETARIA,
  FINANCEIRO: LEITURA,
  GESTOR_TI: [...LEITURA, ...ADMINISTRACAO],
}

export function ePapel(valor: unknown): valor is Papel {
  return typeof valor === 'string' && (PAPEIS as readonly string[]).includes(valor)
}

/** Papel desconhecido: só leitura mínima; o servidor recusa o resto com 403. */
export function permissoesDoPapel(papel: string | undefined): string[] {
  return ePapel(papel) ? [...new Set(PERMISSOES_DO_PAPEL[papel])] : []
}
