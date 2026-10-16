import { useLingui } from '@lingui/react/macro'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { LOCALE } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import { paraDataCivil } from '@/shared/lib/datas'

const SEMANA = { weekStartsOn: 1 } as const // segunda-feira
const formatoMes = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const formatoDiaSemana = new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow' })
const formatoDiaCompleto = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full' })

interface Props {
  /** Dia seleccionado, ou início e fim de um período */
  seleccao: { inicio: Date | null; fim?: Date | null }
  aoEscolher: (dia: Date) => void
  /** Limites (por exemplo, o ano lectivo em contexto) */
  minimo?: Date | null
  maximo?: Date | null
}

/** Calendário com teclado completo: setas, Home/End, PageUp/PageDown, Enter (guia 6.2). */
export function Calendario({ seleccao, aoEscolher, minimo, maximo }: Props) {
  const { t } = useLingui()
  const [foco, setFoco] = useState<Date>(seleccao.inicio ?? new Date())
  const grelha = useRef<HTMLDivElement>(null)
  const mes = startOfMonth(foco)

  const dias: Date[] = []
  for (
    let d = startOfWeek(mes, SEMANA);
    !isAfter(d, endOfWeek(endOfMonth(mes), SEMANA));
    d = addDays(d, 1)
  ) {
    dias.push(d)
  }
  const semanas = Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7))

  const foraDoLimite = (d: Date) =>
    (minimo && isBefore(d, minimo)) || (maximo && isAfter(d, maximo))

  function moverFoco(novo: Date) {
    setFoco(novo)
    requestAnimationFrame(() =>
      grelha.current
        ?.querySelector<HTMLButtonElement>(`[data-dia="${paraDataCivil(novo)}"]`)
        ?.focus(),
    )
  }

  function aoTeclar(e: KeyboardEvent) {
    const mapa: Record<string, () => Date> = {
      ArrowLeft: () => addDays(foco, -1),
      ArrowRight: () => addDays(foco, 1),
      ArrowUp: () => addDays(foco, -7),
      ArrowDown: () => addDays(foco, 7),
      Home: () => startOfWeek(foco, SEMANA),
      End: () => endOfWeek(foco, SEMANA),
      PageUp: () => addMonths(foco, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(foco, e.shiftKey ? 12 : 1),
    }
    const calcular = mapa[e.key]
    if (calcular) {
      e.preventDefault()
      moverFoco(calcular())
    }
  }

  const { inicio, fim } = seleccao
  const noPeriodo = (d: Date) =>
    inicio && fim && !isAfter(inicio, fim)
      ? isWithinInterval(d, { start: inicio, end: fim })
      : false

  return (
    <div className="flex w-72 flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t`Mês anterior`}
          onClick={() => setFoco(addMonths(foco, -1))}
          className="rounded-controlo p-1 text-texto-2 hover:bg-fundo [&_svg]:size-4"
        >
          <ChevronLeft aria-hidden />
        </button>
        <p aria-live="polite" className="text-subtitulo first-letter:uppercase">
          {formatoMes.format(mes)}
        </p>
        <button
          type="button"
          aria-label={t`Mês seguinte`}
          onClick={() => setFoco(addMonths(foco, 1))}
          className="rounded-controlo p-1 text-texto-2 hover:bg-fundo [&_svg]:size-4"
        >
          <ChevronRight aria-hidden />
        </button>
      </div>
      <div
        ref={grelha}
        role="grid"
        tabIndex={-1}
        aria-label={formatoMes.format(mes)}
        onKeyDown={aoTeclar}
        className="flex flex-col gap-1"
      >
        <div role="row" className="grid grid-cols-7 text-center text-legenda text-texto-3">
          {semanas[0]?.map((d) => (
            <span role="columnheader" key={d.toISOString()} className="py-1">
              {formatoDiaSemana.format(d)}
            </span>
          ))}
        </div>
        {semanas.map((semana) => (
          <div role="row" key={semana[0]?.toISOString()} className="grid grid-cols-7">
            {semana.map((d) => {
              const seleccionado = (inicio && isSameDay(d, inicio)) || (fim && isSameDay(d, fim))
              const desactivado = Boolean(foraDoLimite(d))
              return (
                <div
                  role="gridcell"
                  key={d.toISOString()}
                  aria-selected={seleccionado || undefined}
                >
                  <button
                    type="button"
                    data-dia={paraDataCivil(d)}
                    tabIndex={isSameDay(d, foco) ? 0 : -1}
                    disabled={desactivado}
                    aria-label={formatoDiaCompleto.format(d)}
                    aria-current={isToday(d) ? 'date' : undefined}
                    onClick={() => aoEscolher(d)}
                    onFocus={() => setFoco(d)}
                    className={cn(
                      'tabular flex size-9 items-center justify-center rounded-controlo text-corpo',
                      'hover:bg-fundo disabled:pointer-events-none disabled:opacity-30',
                      !isSameMonth(d, mes) && 'text-texto-3',
                      noPeriodo(d) && 'rounded-none bg-acento/10',
                      isToday(d) && 'font-semibold text-acento',
                      seleccionado &&
                        'rounded-controlo bg-acento text-sobre-acento hover:bg-acento',
                    )}
                  >
                    {d.getDate()}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
