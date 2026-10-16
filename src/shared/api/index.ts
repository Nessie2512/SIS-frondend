import type { components } from './schema'

export { api, BASE_URL, novaChaveIdempotencia } from './client'
export { ApiError, eApiError, type CodigoErroDominio, type ErroDeCampo } from './api-error'
export { eventosApi, sessao } from './sessao'
export type { components, paths } from './schema'

/** Atalho para os DTOs: `Dto<'TurmaDto'>`. Só os mapeadores em entities/<nome>/model os devem usar. */
export type Dto<Nome extends keyof components['schemas']> = components['schemas'][Nome]
