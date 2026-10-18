import { analisarCsv, type Analise, type ClasseConhecida } from './analisar'

/**
 * Analisa num Web Worker quando o ambiente o tem; sem Worker (jsdom nos testes), corre aqui
 * mesmo, com o mesmo resultado.
 */
export function analisarEmFundo(texto: string, classes: ClasseConhecida[]): Promise<Analise> {
  if (typeof Worker === 'undefined') return Promise.resolve(analisarCsv(texto, classes))
  return new Promise((resolver, rejeitar) => {
    const trabalhador = new Worker(new URL('./analisar.worker.ts', import.meta.url), {
      type: 'module',
    })
    trabalhador.onmessage = (e: MessageEvent<Analise>) => {
      resolver(e.data)
      trabalhador.terminate()
    }
    trabalhador.onerror = (e) => {
      rejeitar(new Error(e.message || 'Falhou a análise do ficheiro.'))
      trabalhador.terminate()
    }
    trabalhador.postMessage({ texto, classes })
  })
}
