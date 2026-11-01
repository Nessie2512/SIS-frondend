/** Áreas do frontend ligadas ao contrato real do backend SIS. */
export const AREAS_API = [
  'sessao',
  'anos',
  'curriculo',
  'turmas',
  'estudantes',
  'professores',
  'utilizadores',
] as const

export type AreaApi = (typeof AREAS_API)[number]

const modoDeTeste = import.meta.env.MODE === 'mock' || import.meta.env.MODE === 'test'
let areasReais: ReadonlySet<AreaApi> = modoDeTeste ? new Set() : new Set(AREAS_API)

/** Só para testes: liga áreas sem depender das variáveis de ambiente da build. */
export function definirAreasReais(areas: readonly AreaApi[]) {
  areasReais = new Set(areas)
}

/**
 * Em qualquer build do produto, o contrato provisório falha fechado em vez de mostrar dados
 * simulados ou enviar pedidos para o fallback da aplicação estática.
 */
export function eSoApiReal(): boolean {
  return areasReais.size === AREAS_API.length
}

/** Esta área fala com o backend SIS real? */
export function eReal(area: AreaApi): boolean {
  return areasReais.has(area)
}

/**
 * Caminho do backend SIS na mesma origem. Em desenvolvimento, o proxy do Vite encaminha /sis;
 * no Render, uma regra de reescrita em render.yaml. Mesma origem: o backend não aceita CORS.
 */
export const SIS_URL = new URL(import.meta.env.VITE_SIS_BASE ?? '/sis', window.location.origin).href
