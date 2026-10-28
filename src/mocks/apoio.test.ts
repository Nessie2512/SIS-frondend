import { describe, expect, it } from 'vitest'
import { hojeEmAngola } from './apoio'

describe('hojeEmAngola', () => {
  it('à meia-noite e vinte em Luanda já é o dia seguinte, embora em UTC ainda não', () => {
    expect(hojeEmAngola(new Date('2026-10-28T23:20:00Z'))).toBe('2026-10-29')
  })
})
