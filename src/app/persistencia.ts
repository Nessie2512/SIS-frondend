import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'

/**
 * Dados de referência em disco (guia 5.6, 5.8): ao abrir a aplicação, anos lectivos, classes,
 * ciclos, disciplinas e calendário aparecem logo, mesmo com ligação fraca, e confirmam-se com
 * o servidor em segundo plano. Só estes: dados pessoais de estudantes e professores nunca vão
 * para localStorage nem IndexedDB.
 */
export function eReferencia(chave: QueryKey): boolean {
  const [raiz, segundo] = chave
  if (chave.length === 1)
    return raiz === 'anos-lectivos' || raiz === 'classes' || raiz === 'disciplinas'
  if (chave.length === 2)
    return (raiz === 'classes' && segundo === 'ciclos') || raiz === 'calendario'
  return false
}

export interface Armazem {
  ler(): Promise<unknown>
  gravar(valor: Registo): Promise<void>
  apagar(): Promise<void>
}

/** Sobe quando a forma dos dados guardados muda: o que está em disco é então ignorado. */
const VERSAO = 1
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000

export interface Registo {
  versao: number
  guardadoEm: number
  estado: DehydratedState
}

/** Põe na cache o que estava em disco, marcado como por confirmar. Devolve se restaurou. */
export async function restaurarReferencia(
  qc: QueryClient,
  armazem: Armazem,
  agora = Date.now(),
): Promise<boolean> {
  try {
    const registo = (await armazem.ler()) as Registo | undefined
    if (!registo) return false
    if (registo.versao !== VERSAO || agora - registo.guardadoEm > VALIDADE_MS) {
      await armazem.apagar()
      return false
    }
    hydrate(qc, {
      ...registo.estado,
      queries: registo.estado.queries.filter((q) => eReferencia(q.queryKey)),
    })
    // Mostra-se já; ao ser usado, pede-se de novo ao servidor (sem pedir tudo agora)
    await qc.invalidateQueries({ predicate: (q) => eReferencia(q.queryKey), refetchType: 'none' })
    return true
  } catch {
    return false // disco indisponível ou registo estragado: a aplicação segue sem ele
  }
}

/** Grava a referência sempre que chega do servidor (agrupando mudanças seguidas). */
export function guardarReferenciaAoMudar(qc: QueryClient, armazem: Armazem, esperaMs = 1_000) {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const gravar = () =>
    void armazem
      .gravar({
        versao: VERSAO,
        guardadoEm: Date.now(),
        estado: dehydrate(qc, {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && eReferencia(q.queryKey),
        }),
      })
      .catch(() => undefined)
  // Ao fechar ou trocar de separador, grava já o que estava à espera
  const aoSair = () => {
    if (temporizador === undefined) return
    clearTimeout(temporizador)
    temporizador = undefined
    gravar()
  }
  window.addEventListener('pagehide', aoSair)
  const deixar = qc.getQueryCache().subscribe((evento) => {
    if (evento.type !== 'updated' || evento.action.type !== 'success') return
    if (!eReferencia(evento.query.queryKey)) return
    clearTimeout(temporizador)
    temporizador = setTimeout(() => {
      temporizador = undefined
      gravar()
    }, esperaMs)
  })
  return () => {
    clearTimeout(temporizador)
    window.removeEventListener('pagehide', aoSair)
    deixar()
  }
}

/** Armazém no IndexedDB do navegador; null onde não existe (testes, navegação privada antiga). */
export function armazemIndexedDb(): Armazem | null {
  if (typeof indexedDB === 'undefined') return null
  const BD = 'secretaria'
  const LOJA = 'cache'
  const CHAVE = 'referencia'
  const abrir = () =>
    new Promise<IDBDatabase>((resolver, rejeitar) => {
      const pedido = indexedDB.open(BD, 1)
      pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
      pedido.onsuccess = () => resolver(pedido.result)
      pedido.onerror = () => rejeitar(pedido.error)
    })
  const executar = <T>(modo: IDBTransactionMode, accao: (loja: IDBObjectStore) => IDBRequest<T>) =>
    abrir().then(
      (bd) =>
        new Promise<T>((resolver, rejeitar) => {
          const transaccao = bd.transaction(LOJA, modo)
          const pedido = accao(transaccao.objectStore(LOJA))
          pedido.onsuccess = () => resolver(pedido.result)
          pedido.onerror = () => rejeitar(pedido.error)
          transaccao.oncomplete = () => bd.close()
        }),
    )
  return {
    ler: () => executar('readonly', (loja) => loja.get(CHAVE)),
    gravar: (valor) =>
      executar('readwrite', (loja) => loja.put(valor, CHAVE)).then(() => undefined),
    apagar: () => executar('readwrite', (loja) => loja.delete(CHAVE)).then(() => undefined),
  }
}

/** Não esperar pelo disco mais do que isto antes de mostrar a aplicação. */
export const ESPERA_MAXIMA_DISCO_MS = 300
