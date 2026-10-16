import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api'
import { mensagemDeErro } from './erros-dominio'

describe('mensagemDeErro', () => {
  it('traduz códigos de domínio para linguagem simples', () => {
    const erro = new ApiError(409, { title: 'x', status: 409, code: 'LOTACAO_ESGOTADA' })
    expect(mensagemDeErro(erro)).toBe(
      'Esta turma já está cheia. Escolha outra turma ou peça uma excepção.',
    )
  })

  it('nunca mostra o código técnico', () => {
    const erro = new ApiError(409, { title: 'x', status: 409, code: 'ANO_ENCERRADO' })
    expect(mensagemDeErro(erro)).not.toMatch(/ANO_ENCERRADO|409/)
  })

  it('trata falhas de rede como transitórias e diz que o escrito se mantém', () => {
    expect(mensagemDeErro(new ApiError(0, null))).toMatch(/continua aqui/)
    expect(mensagemDeErro(new ApiError(503, null))).toMatch(/continua aqui/)
  })

  it('pede revisão dos campos em erros de validação', () => {
    expect(mensagemDeErro(new ApiError(422, null))).toBe('Reveja os campos assinalados.')
  })
})
