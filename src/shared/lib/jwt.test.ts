import { describe, expect, it } from 'vitest'
import { permissoesDoPapel, permissoesDoSis } from '@/shared/config/papeis'
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

describe('permissões do backend SIS', () => {
  it('chefe da secretaria: anos, currículo, professores, turmas e matrículas', () => {
    const p = permissoesDoPapel('CHEFE_SECRETARIA')
    for (const esperada of [
      'anos:gerir',
      'curriculo:escrever',
      'professores:escrever',
      'turmas:escrever',
      'matriculas:aprovar',
      'estudantes:escrever',
      'administracao:escrever',
    ])
      expect(p).toContain(esperada)
    // O âmbito curriculum (disciplinas por classe) não é dele
    expect(p).not.toContain('planos:escrever')
  })

  it('secretário: cria estudantes e abre a matrícula, mas não aprova nem gere anos', () => {
    const p = permissoesDoPapel('SECRETARIO')
    expect(p).toContain('matriculas:escrever')
    expect(p).not.toContain('matriculas:aprovar')
    expect(p).not.toContain('anos:gerir')
    expect(p).not.toContain('estudantes:escrever')
  })

  it('director pedagógico e admin: só as disciplinas de cada classe', () => {
    for (const papel of ['DIRECTOR_PEDAGOGICO', 'ADMIN']) {
      const p = permissoesDoPapel(papel)
      expect(p).toContain('planos:escrever')
      expect(p).not.toContain('curriculo:escrever')
    }
  })

  it('traduz a lista de /auth/me e ignora nomes desconhecidos', () => {
    const p = permissoesDoSis(['academic:read', 'student-approval:write', 'xpto:read'], 'X')
    expect(p).toEqual(
      expect.arrayContaining(['curriculo:ler', 'professores:ler', 'matriculas:aprovar']),
    )
  })

  it('sem nenhuma reconhecida, vale a tabela do papel; papel desconhecido não ganha nada', () => {
    expect(permissoesDoSis(['xpto:read'], 'GESTOR_TI')).toEqual(permissoesDoPapel('GESTOR_TI'))
    expect(permissoesDoPapel('OUTRO')).toEqual([])
  })
})
