import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  eReferencia,
  guardarReferenciaAoMudar,
  restaurarReferencia,
  type Armazem,
  type Registo,
} from './persistencia'

function armazemEmMemoria() {
  let valor: Registo | undefined
  const armazem: Armazem = {
    ler: () => Promise.resolve(valor),
    gravar: (v) => {
      valor = v
      return Promise.resolve()
    },
    apagar: () => {
      valor = undefined
      return Promise.resolve()
    },
  }
  return { armazem, conteudo: () => valor }
}

describe('dados de referência em disco', () => {
  afterEach(() => vi.useRealTimers())

  it('só a referência vai para disco; dados pessoais nunca', () => {
    expect(eReferencia(['classes'])).toBe(true)
    expect(eReferencia(['classes', 'ciclos'])).toBe(true)
    expect(eReferencia(['disciplinas'])).toBe(true)
    expect(eReferencia(['anos-lectivos'])).toBe(true)
    expect(eReferencia(['calendario', 'ano-2026'])).toBe(true)
    expect(eReferencia(['estudantes', 'lista', {}])).toBe(false)
    expect(eReferencia(['professores', 'detalhe', 'p1'])).toBe(false)
    expect(eReferencia(['anos-lectivos', 'ano-2026', 'encerramento'])).toBe(false)
  })

  it('grava a referência que chega do servidor e volta a pô-la na cache, por confirmar', async () => {
    vi.useFakeTimers()
    const { armazem, conteudo } = armazemEmMemoria()
    const origem = new QueryClient()
    guardarReferenciaAoMudar(origem, armazem, 50)
    origem.setQueryData(['classes'], [{ id: 'c7' }])
    origem.setQueryData(['estudantes', 'lista', { page: 1 }], { estudantes: [{ nome: 'Ana' }] })
    await vi.advanceTimersByTimeAsync(60)
    const chaves = conteudo()!.estado.queries.map((q) => q.queryKey)
    expect(chaves).toEqual([['classes']])
    vi.useRealTimers()

    const destino = new QueryClient()
    expect(await restaurarReferencia(destino, armazem)).toBe(true)
    expect(destino.getQueryData(['classes'])).toEqual([{ id: 'c7' }])
    expect(destino.getQueryState(['classes'])?.isInvalidated).toBe(true)
    expect(destino.getQueryData(['estudantes', 'lista', { page: 1 }])).toBeUndefined()
  })

  it('ignora e apaga o que é de outra versão ou tem mais de uma semana', async () => {
    const { armazem, conteudo } = armazemEmMemoria()
    const origem = new QueryClient()
    origem.setQueryData(['classes'], [])
    const { dehydrate } = await import('@tanstack/react-query')
    await armazem.gravar({ versao: 1, guardadoEm: 0, estado: dehydrate(origem) })
    expect(await restaurarReferencia(new QueryClient(), armazem, 8 * 24 * 3_600_000)).toBe(false)
    expect(conteudo()).toBeUndefined()

    await armazem.gravar({ versao: 99, guardadoEm: Date.now(), estado: dehydrate(origem) })
    expect(await restaurarReferencia(new QueryClient(), armazem)).toBe(false)
  })
})
