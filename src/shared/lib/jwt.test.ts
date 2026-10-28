import { describe, expect, it } from 'vitest'
import { permissoesDoPapel } from '@/shared/config/papeis'
import { jwtDeTeste } from '@/test/jwt'
import { lerJwt, textoDe } from './jwt'

describe('lerJwt', () => {
  it('lê as reivindicações, com acentos e base64url', () => {
    const claims = lerJwt(jwtDeTeste({ sub: 'u-1', name: 'Conceição', role: 'SECRETARIO' }))
    expect(claims).toMatchObject({ sub: 'u-1', name: 'Conceição', role: 'SECRETARIO' })
  })

  it('devolve null para tokens que não são JWT', () => {
    expect(lerJwt('tk-u1')).toBeNull()
    expect(lerJwt('a.!!!.c')).toBeNull()
  })

  it('textoDe escolhe a primeira reivindicação presente', () => {
    expect(textoDe({ uuid: 'x', id: 3 }, 'sub', 'uuid')).toBe('x')
    expect(textoDe({ id: 3 }, 'sub', 'id')).toBe('3')
  })
})

describe('permissoesDoPapel', () => {
  it('o secretário matricula mas não gere anos nem utilizadores', () => {
    const p = permissoesDoPapel('SECRETARIO')
    expect(p).toContain('matriculas:escrever')
    expect(p).not.toContain('anos:gerir')
    expect(p).not.toContain('administracao:escrever')
  })

  it('papel desconhecido não ganha permissões', () => {
    expect(permissoesDoPapel('OUTRO')).toEqual([])
  })
})
