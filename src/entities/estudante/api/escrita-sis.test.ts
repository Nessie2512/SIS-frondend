import { describe, expect, it } from 'vitest'
import { possiveisDuplicados } from './queries'
import { lerDocumento } from './escrita-sis'

describe('lerDocumento', () => {
  it('lê o tipo e o número, com sinónimos em português', () => {
    expect(lerDocumento('BI 002145678LA043')).toEqual({
      documentType: 'BI',
      documentNumber: '002145678LA043',
    })
    expect(lerDocumento('Passaporte N 123')).toEqual({
      documentType: 'PASSPORT',
      documentNumber: 'N123',
    })
    expect(lerDocumento('cédula 77/2013')).toEqual({
      documentType: 'BIRTH_CERTIFICATE',
      documentNumber: '77/2013',
    })
  })

  it('só o número assume BI; vazio é sem documento; tipo desconhecido é inválido', () => {
    expect(lerDocumento('002145678LA043')).toEqual({
      documentType: 'BI',
      documentNumber: '002145678LA043',
    })
    expect(lerDocumento('  ')).toEqual({ documentType: 'N/A', documentNumber: '' })
    expect(lerDocumento('Cartão 123')).toBeNull()
    expect(lerDocumento('BI')).toBeNull()
  })
})

describe('possiveisDuplicados', () => {
  const lista = [
    { nome: 'Conceição Neto', dataNascimento: '2012-04-12' },
    { nome: 'Ana Maria Domingos', dataNascimento: '2011-01-01' },
  ]
  it('mesmo nome completo, sem acentos nem maiúsculas', () => {
    expect(possiveisDuplicados(lista, 'conceicao neto')).toHaveLength(1)
  })
  it('primeiro e último nome com a mesma data de nascimento', () => {
    expect(possiveisDuplicados(lista, 'Ana Domingos', '2011-01-01')).toHaveLength(1)
    expect(possiveisDuplicados(lista, 'Ana Domingos', '2011-02-02')).toHaveLength(0)
  })
})

describe('ficha do estudante no backend SIS', () => {
  it('documento por PUT identity e anular por DELETE, ambos pelo uuid', async () => {
    const { escutarEscritas } = await import('@/test/hook-sis')
    const { alterarDocumentoSis, anularEstudanteSis } = await import('./escrita-sis')
    const pedidos = escutarEscritas()
    await alterarDocumentoSis('est-1', 'Passaporte N1234')
    await anularEstudanteSis('est-1')
    expect(pedidos.map((p) => [p.metodo, p.caminho, p.corpo])).toEqual([
      ['PUT', '/students/est-1/identity', { documentType: 'PASSPORT', documentNumber: 'N1234' }],
      ['DELETE', '/students/est-1', null],
    ])
  })

  it('documento ilegível não chega ao servidor', async () => {
    const { alterarDocumentoSis } = await import('./escrita-sis')
    await expect(alterarDocumentoSis('est-1', 'Cartão 1')).rejects.toMatchObject({ status: 422 })
  })
})
