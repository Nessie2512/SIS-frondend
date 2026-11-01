import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AREAS_API, definirAreasReais, eReal } from './ligacao'

beforeEach(() => definirAreasReais([]))
afterEach(() => definirAreasReais([]))

describe('ligação ao backend', () => {
  it('permite aos testes escolher explicitamente quais áreas usam o contrato SIS', () => {
    definirAreasReais(['sessao', 'anos'])
    expect(AREAS_API.filter(eReal)).toEqual(['sessao', 'anos'])
  })

  it('os testes começam sem alterar o comportamento simulado do MSW', () => {
    expect(AREAS_API.some(eReal)).toBe(false)
  })
})
