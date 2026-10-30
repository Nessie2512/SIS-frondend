import { afterEach, describe, expect, it } from 'vitest'
import { AREAS_API, definirAreasReais, eSoApiReal } from '@/shared/config/ligacao'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { api } from './client'
import { ApiError } from './api-error'

afterEach(() => definirAreasReais([]))

describe('staging só com a API real', () => {
  it('o contrato provisório responde "não disponível" sem ir à rede', async () => {
    definirAreasReais(AREAS_API)
    expect(eSoApiReal()).toBe(true)
    const erro = (await api
      .GET('/painel', { params: { query: { anoLectivoId: 'ano-2026' } } })
      .catch((e: unknown) => e)) as ApiError
    expect(erro).toBeInstanceOf(ApiError)
    expect(erro.status).toBe(501)
    expect(erro.temCodigo('NAO_DISPONIVEL')).toBe(true)
    // Não é transitório: nem as queries repetem nem se oferece "Tentar de novo"
    expect(erro.eTransitorio).toBe(false)
    expect(mensagemDeErro(erro)).toMatch(/ainda não está disponível no servidor/)
  })

  it('com só algumas áreas reais, o resto continua no MSW', async () => {
    definirAreasReais(['sessao'])
    expect(eSoApiReal()).toBe(false)
    const { data } = await api.GET('/anos-lectivos', {})
    expect(data?.length).toBeGreaterThan(0)
  })
})
