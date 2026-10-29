import { describe, expect, it } from 'vitest'
import { AREAS_API, eReal, lerAreasReais } from './ligacao'

describe('lerAreasReais', () => {
  it('lê a lista separada por vírgulas e ignora áreas desconhecidas', () => {
    expect([...lerAreasReais(' sessao, Anos ,xpto')]).toEqual(['sessao', 'anos'])
  })

  it('"todas" liga todas as áreas', () => {
    expect(lerAreasReais('todas').size).toBe(AREAS_API.length)
  })

  it('sem valor, nenhuma área é real (os testes correm sobre o MSW)', () => {
    expect(lerAreasReais(undefined).size).toBe(0)
    expect(AREAS_API.some(eReal)).toBe(false)
  })
})
