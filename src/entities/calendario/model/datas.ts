import { FUSO_HORARIO, LOCALE } from '@/shared/config/constantes'
import type { Evento, Trimestre } from './tipos'

/**
 * Aritmética de datas civis (AAAA-MM-DD) em UTC, sem fusos (guia 8.2):
 * o calendário é de dias, não de instantes.
 */
const DIA = 86_400_000
const dois = (n: number) => String(n).padStart(2, '0')

export const paraUtc = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a!, m! - 1, d!))
}
export const deUtc = (data: Date) =>
  `${data.getUTCFullYear()}-${dois(data.getUTCMonth() + 1)}-${dois(data.getUTCDate())}`
export const somarDias = (iso: string, dias: number) =>
  deUtc(new Date(paraUtc(iso).getTime() + dias * DIA))
export const somarMeses = (iso: string, meses: number) => {
  const d = paraUtc(iso)
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(d.getUTCDate(), ultimo))
  return deUtc(alvo)
}
export const limitar = (iso: string, minimo: string, maximo: string) =>
  iso < minimo ? minimo : iso > maximo ? maximo : iso

/** Hoje como data civil em Luanda. */
export function hojeCivil(agora = new Date()) {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_HORARIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora)
}

/** Meses (primeiro dia de cada) entre duas datas, inclusive. */
export function mesesEntre(inicio: string, fim: string) {
  const meses: string[] = []
  let atual = `${inicio.slice(0, 7)}-01`
  while (atual <= fim) {
    meses.push(atual)
    atual = somarMeses(atual, 1)
  }
  return meses
}

/** Semanas do mês, de segunda a domingo; null nos dias de fora do mês. */
export function semanasDoMes(primeiroDia: string): (string | null)[][] {
  const d = paraUtc(primeiroDia)
  const diasNoMes = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  const desvio = (d.getUTCDay() + 6) % 7 // segunda = 0
  const celulas: (string | null)[] = Array.from({ length: desvio }, () => null)
  for (let dia = 0; dia < diasNoMes; dia++) celulas.push(somarDias(primeiroDia, dia))
  while (celulas.length % 7) celulas.push(null)
  const semanas: (string | null)[][] = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

export const trimestreDe = (dia: string, trimestres: Trimestre[]) =>
  trimestres.find((t) => dia >= t.inicio && dia <= t.fim)

export const eventosDe = (dia: string, eventos: Evento[]) =>
  eventos.filter((e) => dia >= e.inicio && dia <= e.fim)

const formatoLongo = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatoMes = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const formatoCurto = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** «quarta-feira, 11 de novembro de 2026» */
export const dataPorExtenso = (iso: string) => formatoLongo.format(paraUtc(iso))
/** «novembro de 2026» */
export const nomeDoMes = (iso: string) => formatoMes.format(paraUtc(iso))
/** «11/11» ou «12/12 – 3/01» */
export const intervaloCurto = (inicio: string, fim: string) =>
  inicio === fim
    ? formatoCurto.format(paraUtc(inicio))
    : formatoCurto.formatRange(paraUtc(inicio), paraUtc(fim))

/** Dias da semana, de segunda a domingo: [curto, por extenso]. */
export const DIAS_DA_SEMANA = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(Date.UTC(2024, 0, 1 + i)) // 1 de Janeiro de 2024 foi segunda-feira
  return [
    new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow', timeZone: 'UTC' }).format(d),
    new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: 'UTC' }).format(d),
  ] as const
})
