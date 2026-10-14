import { describe, expect, it } from 'vitest'
import { paraTurma } from './mapeadores'

const base = {
  id: 't1',
  designacao: '7.ª A',
  classeId: 'c7',
  classeDesignacao: '7.ª classe',
  turno: 'MANHA' as const,
  sala: 'Sala 3',
  lotacaoMaxima: 40,
  inscritos: 38,
  estado: 'ACTIVA' as const,
}

describe('paraTurma', () => {
  it('calcula vagas, ocupação e rótulo do turno', () => {
    const turma = paraTurma(base)
    expect(turma.vagas).toBe(2)
    expect(turma.ocupacao).toBeCloseTo(0.95)
    expect(turma.turnoRotulo).toBe('Manhã')
    expect(turma.turmaCheia).toBe(false)
  })

  it('marca a turma cheia e nunca devolve vagas negativas', () => {
    const turma = paraTurma({ ...base, inscritos: 42 })
    expect(turma.turmaCheia).toBe(true)
    expect(turma.vagas).toBe(0)
    expect(turma.ocupacao).toBe(1)
  })

  it('reconhece turma encerrada (só de leitura)', () => {
    expect(paraTurma({ ...base, estado: 'ENCERRADA' }).encerrada).toBe(true)
  })
})
