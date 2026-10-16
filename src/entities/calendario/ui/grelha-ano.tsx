import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { LOCALE } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import {
  dataPorExtenso,
  DIAS_DA_SEMANA,
  eventosDe,
  hojeCivil,
  limitar,
  mesesEntre,
  nomeDoMes,
  semanasDoMes,
  somarDias,
  somarMeses,
  trimestreDe,
} from '../model/datas'
import type { Calendario, Evento } from '../model/tipos'

interface Props {
  calendario: Calendario
  /** Limites do ano lectivo (AAAA-MM-DD) */
  inicio: string
  fim: string
  /** Dia aberto (realçado) */
  seleccionado?: string
  aoEscolherDia: (dia: string) => void
}

/** Fundo por trimestre: alterna para as faixas se distinguirem; a cor só reforça o texto. */
const classesTrimestre = ['', 'bg-acento/8', 'bg-acento/16', 'bg-acento/8']

const lista = new Intl.ListFormat(LOCALE, { style: 'long', type: 'unit' })

/**
 * Calendário do ano (guia 6.3): meses em grelha com faixas de trimestre, feriados e
 * datas-chave assinalados; clicar num dia abre-o. Teclado: setas mudam de dia e de semana,
 * PageUp e PageDown mudam de mês, Enter abre o dia; só um dia é focável de cada vez.
 */
export function GrelhaAno({ calendario, inicio, fim, seleccionado, aoEscolherDia }: Props) {
  const { t } = useLingui()
  const hoje = hojeCivil()
  const [foco, setFoco] = useState(() => limitar(seleccionado ?? hoje, inicio, fim))
  const botoes = useRef(new Map<string, HTMLButtonElement>())
  const peloTeclado = useRef(false)

  useEffect(() => {
    if (!peloTeclado.current) return
    peloTeclado.current = false
    botoes.current.get(foco)?.focus()
  }, [foco])

  function aoTeclar(e: KeyboardEvent<HTMLButtonElement>, dia: string) {
    const destinos: Record<string, () => string> = {
      ArrowLeft: () => somarDias(dia, -1),
      ArrowRight: () => somarDias(dia, 1),
      ArrowUp: () => somarDias(dia, -7),
      ArrowDown: () => somarDias(dia, 7),
      PageUp: () => somarMeses(dia, -1),
      PageDown: () => somarMeses(dia, 1),
    }
    const destino = destinos[e.key]
    if (!destino) return
    e.preventDefault()
    peloTeclado.current = true
    setFoco(limitar(destino(), inicio, fim))
  }

  function descrever(dia: string, eventos: Evento[]) {
    const trimestre = trimestreDe(dia, calendario.trimestres)?.rotulo
    const partes = [
      dataPorExtenso(dia),
      ...(dia === hoje ? [t`hoje`] : []),
      ...(trimestre ? [trimestre] : []),
      ...eventos.map((e) => {
        const tipo = e.tipoRotulo
        const titulo = e.titulo
        return t`${tipo}: ${titulo}`
      }),
    ]
    return lista.format(partes)
  }

  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {mesesEntre(inicio, fim).map((mes) => {
        const nome = nomeDoMes(mes)
        const idTitulo = `mes-${mes}`
        return (
          <section key={mes} aria-labelledby={idTitulo} className="flex flex-col gap-2">
            <h3 id={idTitulo} className="text-subtitulo first-letter:uppercase">
              {nome}
            </h3>
            <table className="w-full table-fixed border-separate border-spacing-y-0.5 text-center">
              <thead>
                <tr>
                  {DIAS_DA_SEMANA.map(([curto, longo]) => (
                    <th
                      key={longo}
                      scope="col"
                      abbr={longo}
                      className="pb-1 text-legenda font-normal text-texto-3"
                    >
                      {curto}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semanasDoMes(mes).map((semana, i) => (
                  <tr key={i}>
                    {semana.map((dia, j) => {
                      if (!dia || dia < inicio || dia > fim) {
                        return <td key={j} aria-hidden />
                      }
                      const eventos = eventosDe(dia, calendario.eventos)
                      const trimestre = trimestreDe(dia, calendario.trimestres)
                      const feriado = eventos.some((e) => e.tipo === 'FERIADO')
                      const interrupcao = eventos.some((e) => e.tipo === 'INTERRUPCAO')
                      const marcas = eventos.filter(
                        (e) => e.tipo === 'DATA_CHAVE' || e.tipo === 'EVENTO',
                      )
                      const fimDeSemana = j >= 5
                      return (
                        <td
                          key={j}
                          className={cn(
                            'p-0',
                            trimestre && !interrupcao && classesTrimestre[trimestre.numero],
                            // Faixa contínua: cantos só no início e no fim da semana
                            j === 0 && 'rounded-l-controlo',
                            j === 6 && 'rounded-r-controlo',
                          )}
                        >
                          <button
                            type="button"
                            ref={(no) => {
                              if (no) botoes.current.set(dia, no)
                              else botoes.current.delete(dia)
                            }}
                            tabIndex={dia === foco ? 0 : -1}
                            aria-label={descrever(dia, eventos)}
                            aria-current={dia === hoje ? 'date' : undefined}
                            aria-pressed={dia === seleccionado}
                            onClick={() => {
                              setFoco(dia)
                              aoEscolherDia(dia)
                            }}
                            onKeyDown={(e) => aoTeclar(e, dia)}
                            onFocus={() => setFoco(dia)}
                            className={cn(
                              'tabular relative mx-auto flex size-8 flex-col items-center justify-center rounded-full text-secundario outline-none',
                              'hover:bg-superficie focus-visible:ring-2 focus-visible:ring-acento',
                              fimDeSemana && 'text-texto-3',
                              feriado && 'font-semibold text-perigo',
                              interrupcao && 'text-texto-3 line-through decoration-texto-3/40',
                              dia === hoje && 'ring-1 ring-texto-1',
                              dia === seleccionado && 'bg-acento text-sobre-acento hover:bg-acento',
                            )}
                          >
                            {Number(dia.slice(8))}
                            {marcas.length > 0 && (
                              <span
                                aria-hidden
                                className={cn(
                                  'absolute bottom-0.5 size-1 rounded-full',
                                  dia === seleccionado
                                    ? 'bg-sobre-acento'
                                    : marcas.some((m) => m.tipo === 'DATA_CHAVE')
                                      ? 'bg-acento'
                                      : 'bg-texto-3',
                                )}
                              />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

/** Legenda do calendário: o que cada marca quer dizer (a cor nunca está sozinha). */
export function LegendaCalendario({ calendario }: { calendario: Calendario }) {
  const { t } = useLingui()
  return (
    <ul
      aria-label={t`Legenda`}
      className="flex flex-wrap items-center gap-x-5 gap-y-2 text-secundario text-texto-2"
    >
      {calendario.trimestres.map((tr) => (
        <li key={tr.numero} className="flex items-center gap-2">
          <span aria-hidden className={cn('h-3 w-5 rounded-[3px]', classesTrimestre[tr.numero])} />
          {tr.rotulo}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span aria-hidden className="text-legenda font-semibold text-perigo">
          11
        </span>
        {t`Feriado`}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="size-1.5 rounded-full bg-acento" />
        {t`Data-chave`}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="size-1.5 rounded-full bg-texto-3" />
        {t`Evento`}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="text-legenda text-texto-3 line-through">
          11
        </span>
        {t`Interrupção lectiva`}
      </li>
    </ul>
  )
}
