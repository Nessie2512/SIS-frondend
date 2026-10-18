/// <reference lib="webworker" />
import { analisarCsv, type ClasseConhecida } from './analisar'

// Análise fora da thread principal (guia 5.6): ficheiros de milhares de linhas não prendem o ecrã
self.onmessage = (e: MessageEvent<{ texto: string; classes: ClasseConhecida[] }>) => {
  self.postMessage(analisarCsv(e.data.texto, e.data.classes))
}
