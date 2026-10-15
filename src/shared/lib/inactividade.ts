import { useEffect, useState } from 'react'

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** true depois de `minutos` sem interacção (guia 4.4: bloqueio de ecrã por inactividade). */
export function useInactivo(minutos: number, activo = true): [boolean, () => void] {
  const [inactivo, setInactivo] = useState(false)

  useEffect(() => {
    if (!activo || inactivo) return
    let temporizador = setTimeout(() => setInactivo(true), minutos * 60_000)
    const reiniciar = () => {
      clearTimeout(temporizador)
      temporizador = setTimeout(() => setInactivo(true), minutos * 60_000)
    }
    EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    return () => {
      clearTimeout(temporizador)
      EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar))
    }
  }, [minutos, activo, inactivo])

  return [inactivo, () => setInactivo(false)]
}
