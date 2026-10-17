import { delay, HttpResponse, type DefaultBodyType, type StrictRequest } from 'msw'
import type { components } from '@/shared/api'
import { anosLectivos, db, UTILIZADORES } from './db'

/** Auxiliares partilhados pelos handlers do MSW. */
export type S = components['schemas']
export const API = '/api/v1'

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
  return UTILIZADORES.find((u) => u.id === id)
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

export function paginar<T>(lista: T[], url: URL) {
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
