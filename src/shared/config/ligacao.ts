/**
 * Ligação faseada ao backend SIS (guia 4.3).
 *
 * Cada área passa para a API real quando o contrato dela está validado; as outras continuam
 * no MSW (modo híbrido) ou à espera do backend. A lista vem de VITE_API_REAL:
 *
 *   VITE_API_REAL=sessao,anos      só estas áreas usam a API real
 *   VITE_API_REAL=todas            todas as áreas abaixo
 *   (vazio)                        nenhuma: comportamento de antes
 */
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

export function lerAreasReais(valor: string | undefined): ReadonlySet<AreaApi> {
  const pedidas = (valor ?? '')
    .split(',')
    .map((parte) => parte.trim().toLowerCase())
    .filter(Boolean)
  if (pedidas.includes('todas')) return new Set(AREAS_API)
  return new Set(AREAS_API.filter((area) => pedidas.includes(area)))
}

const areasReais = lerAreasReais(import.meta.env.VITE_API_REAL)

/** Esta área fala com o backend SIS real? */
export function eReal(area: AreaApi): boolean {
  return areasReais.has(area)
}

/**
 * Caminho do backend SIS na mesma origem. Em desenvolvimento, o proxy do Vite encaminha /sis;
 * no Render, uma regra de reescrita em render.yaml. Mesma origem: o backend não aceita CORS.
 */
export const SIS_URL = new URL(import.meta.env.VITE_SIS_BASE ?? '/sis', window.location.origin).href
