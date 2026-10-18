import { describe, expect, it } from 'vitest'
import { analisarCsv, MODELO_CSV } from './analisar'

const CLASSES = [
  { id: 'c7', designacao: '7.ª classe' },
  { id: 'c8', designacao: '8.ª classe' },
]
const HOJE = new Date('2026-10-01T12:00:00Z')

describe('analisarCsv', () => {
  it('aceita o modelo tal como se descarrega', () => {
    const r = analisarCsv(`\uFEFF${MODELO_CSV}`, CLASSES, HOJE)
    expect(r.erroFicheiro).toBeNull()
    expect(r.erros).toEqual([])
    expect(r.validas.map((l) => [l.linha, l.classeId, l.dataNascimento])).toEqual([
      [2, 'c7', '2014-03-14'],
      [3, 'c8', '2013-09-02'],
    ])
    expect(r.validas[0]!.encarregado.telefone).toBe('923456789')
    expect(r.validas[0]!.documentoIdentificacao).toBe('004512345LA041')
  })

  it('aponta cada erro à linha e à coluna, e apanha repetidos no ficheiro', () => {
    const csv = [
      'nome,sexo,data_nascimento,bilhete,classe,encarregado,parentesco,telefone',
      'Joana,X,31/02/2014,123,7,,Mãe,12345',
      '"Rui, o Grande Pinto",M,01/01/2012,,7.ª,Ana Pinto,Mãe,+244 912 000 111',
      'Rui, o Grande Pinto,M,01/01/2012,,7.ª,Ana Pinto,Mãe,912000111',
      '"Rui, o Grande Pinto",M,01/01/2012,,7.ª,Ana Pinto,Mãe,912000111',
      'Carla Sousa,F,01/01/2012,,13.ª classe,Ana Sousa,Mãe,912000222',
      '',
    ].join('\n')
    const r = analisarCsv(csv, CLASSES, HOJE)
    expect(r.total).toBe(5)
    const da = (linha: number) => r.erros.filter((e) => e.linha === linha).map((e) => e.campo)
    expect(da(2).sort()).toEqual(
      ['bilhete', 'data_nascimento', 'encarregado', 'nome', 'sexo', 'telefone'].sort(),
    )
    expect(da(3)).toEqual([])
    // Sem aspas, a vírgula do nome desloca as colunas: erros em vez de dados trocados
    expect(da(4).length).toBeGreaterThan(0)
    expect(r.erros.find((e) => e.linha === 5)).toMatchObject({
      codigo: 'LINHA_REPETIDA',
      valor: '3',
    })
    expect(r.erros.find((e) => e.linha === 6)).toMatchObject({
      codigo: 'CLASSE_DESCONHECIDA',
      valor: '13.ª classe',
    })
    expect(r.validas.map((l) => l.linha)).toEqual([3])
    expect(r.validas[0]!.encarregado.telefone).toBe('912000111')
  })

  it('recusa o ficheiro sem as colunas do modelo', () => {
    expect(analisarCsv('nome;idade\nAna;12', CLASSES, HOJE).erroFicheiro).toEqual({
      codigo: 'COLUNAS_EM_FALTA',
      colunas: [
        'sexo',
        'data_nascimento',
        'bilhete',
        'classe',
        'encarregado',
        'parentesco',
        'telefone',
      ],
    })
    expect(analisarCsv('', CLASSES, HOJE).erroFicheiro).toEqual({ codigo: 'VAZIO' })
  })
})
