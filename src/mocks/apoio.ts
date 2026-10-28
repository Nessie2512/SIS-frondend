import { delay, HttpResponse, type DefaultBodyType, type StrictRequest } from 'msw'
import type { components } from '@/shared/api'
import { FUSO_HORARIO } from '@/shared/config/constantes'
import { permissoesDoPapel } from '@/shared/config/papeis'
import { lerJwt, textoDe } from '@/shared/lib/jwt'
import { anosLectivos, db, UTILIZADORES } from './db'

/** Auxiliares partilhados pelos handlers do MSW. */
export type S = components['schemas']
export const API = '/api/v1'

/**
 * Data civil de hoje em Angola (AAAA-MM-DD), como o servidor a deve ver. Não usar
 * toISOString(): entre as 00:00 e a 01:00 de Luanda ainda é ontem em UTC.
 */
export const hojeEmAngola = (agora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_HORARIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora)

/** Latência simulada só no navegador; nos testes responde de imediato. */
export const latencia = (ms: number) => delay(import.meta.env.MODE === 'test' ? 0 : ms)

// ---------------------------------------------------------------------------
// Respostas de erro no formato application/problem+json (guia 2.6)
// ---------------------------------------------------------------------------
export function problema(
  status: number,
  title: string,
  extra: Partial<S['ProblemaDto']> & Record<string, unknown> = {},
) {
  return HttpResponse.json(
    { title, status, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

// ---------------------------------------------------------------------------
// Sessão simulada: token "tk-<utilizador>"; o cookie "sessao" faz de token de renovação
// ---------------------------------------------------------------------------
export function utilizadorDo(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const id = token?.startsWith('tk-') ? token.slice(3) : undefined
  return UTILIZADORES.find((u) => u.id === id) ?? utilizadorDoJwt(token)
}

/**
 * Modo híbrido (pnpm dev:hibrido): a sessão vem do backend SIS real e o token é um JWT. As
 * áreas ainda simuladas aceitam-no e dão as permissões do papel (a assinatura não se verifica).
 */
function utilizadorDoJwt(token: string | undefined) {
  const claims = token ? lerJwt(token) : null
  if (!claims) return undefined
  if (claims.exp && claims.exp * 1000 < Date.now()) return undefined
  const papel = textoDe(claims, 'role', 'papel')
  return {
    id: textoDe(claims, 'sub', 'uuid', 'id') ?? 'sis',
    nome: textoDe(claims, 'name', 'nome', 'email') ?? 'Utilizador',
    email: textoDe(claims, 'email') ?? '',
    palavraPasse: '',
    permissoes: permissoesDoPapel(papel),
  }
}

export type Contexto = {
  request: StrictRequest<DefaultBodyType>
  params: Record<string, string | readonly string[] | undefined>
}

/** Exige sessão (401) e, opcionalmente, uma permissão (403). */
export function protegido<C extends Contexto>(
  permissao: string | null,
  resolver: (c: C) => Response | Promise<Response>,
) {
  return async (contexto: C) => {
    await latencia(120)
    const utilizador = utilizadorDo(contexto.request)
    if (!utilizador) return problema(401, 'Sessão expirada')
    if (permissao && !utilizador.permissoes.includes(permissao)) {
      return problema(403, 'Permissão negada', { code: 'PERMISSAO_NEGADA' })
    }
    return resolver(contexto)
  }
}

export const anoEncerrado = (anoLectivoId: string) =>
  anosLectivos.find((a) => a.id === anoLectivoId)?.estado === 'ENCERRADO'
export const etag = (versao: number) => `"v${versao}"`

/** Ordena por um campo do DTO: «nome» ou «-nome»; nulos no fim (guia 7.1: ordenação no URL). */
function ordenar<T>(lista: T[], ordem: string | null): T[] {
  if (!ordem) return lista
  const desc = ordem.startsWith('-')
  const campo = ordem.replace(/^-/, '') as keyof T
  const sinal = desc ? -1 : 1
  return [...lista].sort((a, b) => {
    const x = a[campo]
    const y = b[campo]
    if (x === y) return 0
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sinal
    return String(x).localeCompare(String(y), 'pt', { numeric: true }) * sinal
  })
}

export function paginar<T>(listaOriginal: T[], url: URL) {
  const lista = ordenar(listaOriginal, url.searchParams.get('ordenar'))
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') ?? 50))
  return {
    items: lista.slice((page - 1) * pageSize, page * pageSize),
    total: lista.length,
    page,
    pageSize,
  }
}

/** Repete a resposta original quando a mesma Idempotency-Key volta a chegar (guia 4.5). */
export function idempotente(request: Request, criar: () => Response): Response {
  const chave = request.headers.get('Idempotency-Key')
  if (!chave) return problema(400, 'Falta a Idempotency-Key')
  const anterior = db.idempotencia.get(chave) as { status: number; corpo: unknown } | undefined
  if (anterior)
    return HttpResponse.json(anterior.corpo as DefaultBodyType, { status: anterior.status })
  const resposta = criar()
  void resposta
    .clone()
    .json()
    .then((corpo) => db.idempotencia.set(chave, { status: resposta.status, corpo }))
  return resposta
}
