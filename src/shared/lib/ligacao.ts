import { useSyncExternalStore } from 'react'

function subscrever(aviso: () => void) {
  window.addEventListener('online', aviso)
  window.addEventListener('offline', aviso)
  return () => {
    window.removeEventListener('online', aviso)
    window.removeEventListener('offline', aviso)
  }
}

/** true enquanto o navegador tem ligação (guia 5.8). */
export function useComLigacao(): boolean {
  return useSyncExternalStore(
    subscrever,
    () => navigator.onLine,
    () => true,
  )
}
