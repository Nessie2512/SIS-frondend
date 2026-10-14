/**
 * Datas e números (guia 8.2).
 * - Instantes (timestamps) mostram-se no fuso Africa/Luanda.
 * - Datas civis (AAAA-MM-DD: nascimento, início do ano) NUNCA passam por conversão de fuso.
 */
import { LOCALE, FUSO_HORARIO } from '@/shared/config/constantes'

const formatoData = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatoInstante = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSO_HORARIO,
})
const formatoNumero = new Intl.NumberFormat(LOCALE)

/** "2026-03-01" → "01/03/2026", sem conversão de fuso. */
export function formatarDataCivil(isoData: string): string {
  const [ano, mes, dia] = isoData.split('-').map(Number)
  if (!ano || !mes || !dia) return isoData
  return formatoData.format(new Date(Date.UTC(ano, mes - 1, dia)))
}

/** Instante ISO com hora → data e hora em Luanda. */
export function formatarInstante(iso: string | Date): string {
  return formatoInstante.format(typeof iso === 'string' ? new Date(iso) : iso)
}

export function formatarNumero(valor: number): string {
  return formatoNumero.format(valor)
}
