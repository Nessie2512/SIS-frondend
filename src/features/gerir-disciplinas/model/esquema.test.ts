import { describe, expect, it } from 'vitest'
import { esquemaDisciplina } from './esquema'

const sigla = (valor: string) => esquemaDisciplina.safeParse({ nome: 'Disciplina', sigla: valor })

describe('Sigla da disciplina', () => {
  it.each(['MAT', 'EMC', 'L/P', 'TLP/A', 'em/c'])('aceita %s', (valor) => {
    expect(sigla(valor).success).toBe(true)
  })

  it('guarda em maiúsculas', () => {
    expect(sigla('l/p').data?.sigla).toBe('L/P')
  })

  it.each(['M', '/MAT', 'MAT/', 'L//P', 'L-P', 'MAT.', 'L P', 'MATEMA', 'ABC/DEF'])(
    'recusa %s',
    (valor) => {
      expect(sigla(valor).success).toBe(false)
    },
  )
})
