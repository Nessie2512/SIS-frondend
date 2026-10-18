import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Plurais correctos (guia 8.2): uma quantidade seguida de um substantivo tem de passar por
 * plural() do Lingui, para «1 estudante» e «2 estudantes». Heurística sobre o catálogo: um
 * marcador seguido de uma palavra no plural, numa mensagem sem «plural,».
 */
// Marcadores que não são quantidades (nomes, designações, datas, valores)
const NAO_QUANTIDADES = new Set([
  'nome',
  'quem',
  'designacao',
  'titulo',
  'classe',
  'origem',
  'destino',
  'nomeTurma',
  'nomeDestino',
  'nomeEstudante',
  'turma',
  'de',
  'ate',
])
// Unidades e palavras que não variam («5 h», «3 de 10»)
const INVARIAVEIS = new Set(['h', 'de', 'a', 'em', 'mais', 'menos'])

function mensagens(): string[] {
  const po = readFileSync('src/shared/i18n/locales/pt-AO/messages.po', 'utf8')
  return [...po.matchAll(/^msgid "(.*)"$/gm)].map((m) => m[1]!).filter(Boolean)
}

describe('catálogo: plurais', () => {
  it('nenhuma quantidade seguida de substantivo fica sem plural()', () => {
    const suspeitas = mensagens().filter((m) => {
      if (m.includes('plural,')) return false
      return [...m.matchAll(/\{(\w+)\} (\p{L}+)/gu)].some(
        ([, marcador, palavra]) =>
          !NAO_QUANTIDADES.has(marcador!) && !INVARIAVEIS.has(palavra!) && /s$/.test(palavra!),
      )
    })
    expect(suspeitas).toEqual([])
  })

  it('verbos no plural antes de uma quantidade também mudam («Faltam 2», «Falta 1»)', () => {
    const suspeitas = mensagens().filter(
      (m) => !m.includes('plural,') && /\b(Faltam|faltam|ficam|Ficam) \{\w+\}/.test(m),
    )
    expect(suspeitas).toEqual([])
  })
})
