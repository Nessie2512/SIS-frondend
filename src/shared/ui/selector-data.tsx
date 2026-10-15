import { Trans, useLingui } from '@lingui/react/macro'
import { format, isAfter, isBefore, isValid, parse } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useState } from 'react'
import { deDataCivil, paraDataCivil } from '@/shared/lib/datas'
import { Calendario } from './calendario'
import { Campo, Entrada } from './campo'

const FORMATO = 'dd/MM/yyyy'
const mostrar = (iso: string | null) => {
  const d = deDataCivil(iso)
  return d ? format(d, FORMATO) : ''
}

interface Props {
  rotulo: string
  /** Data civil AAAA-MM-DD */
  valor: string | null
  aoMudar: (valor: string | null) => void
  /** Limites, também AAAA-MM-DD (ex.: início e fim do ano lectivo) */
  minimo?: string
  maximo?: string
  obrigatorio?: boolean
  desactivado?: boolean
  erro?: string
  descricao?: string
}

/**
 * Selector de data (guia 6.2): escreve-se dd/mm/aaaa ou escolhe-se no calendário.
 * Mostra "data inválida" e "fora do intervalo do ano lectivo" sem impedir escrever.
 */
export function SelectorData({
  rotulo,
  valor,
  aoMudar,
  minimo,
  maximo,
  obrigatorio,
  desactivado,
  erro,
  descricao,
}: Props) {
  const { t } = useLingui()
  const [texto, setTexto] = useState(mostrar(valor))
  const [erroLocal, setErroLocal] = useState<string>()
  const [aberto, setAberto] = useState(false)
  const min = deDataCivil(minimo)
  const max = deDataCivil(maximo)

  function validar(dia: Date | null): string | undefined {
    if (!dia) return undefined
    if ((min && isBefore(dia, min)) || (max && isAfter(dia, max))) {
      const de = mostrar(minimo ?? null)
      const ate = mostrar(maximo ?? null)
      return t`A data está fora do ano lectivo (${de} a ${ate}).`
    }
    return undefined
  }

  function aoSair() {
    if (!texto.trim()) {
      setErroLocal(undefined)
      aoMudar(null)
      return
    }
    const dia = parse(texto.trim(), FORMATO, new Date())
    if (!isValid(dia)) {
      setErroLocal(t`Data inválida. Use o formato dd/mm/aaaa.`)
      return
    }
    const problema = validar(dia)
    setErroLocal(problema)
    if (!problema) aoMudar(paraDataCivil(dia))
  }

  function escolher(dia: Date) {
    setTexto(format(dia, FORMATO))
    setErroLocal(undefined)
    aoMudar(paraDataCivil(dia))
    setAberto(false)
  }

  return (
    <Campo
      rotulo={rotulo}
      obrigatorio={obrigatorio}
      erro={erroLocal ?? erro}
      descricao={descricao ?? t`dd/mm/aaaa`}
    >
      {(controlo) => (
        <Popover.Root open={aberto} onOpenChange={setAberto}>
          <Popover.Anchor asChild>
            <div>
              <Entrada
                {...controlo}
                inputMode="numeric"
                autoComplete="off"
                value={texto}
                disabled={desactivado}
                onChange={(e) => setTexto(e.target.value)}
                onBlur={aoSair}
                sufixo={
                  <Popover.Trigger
                    disabled={desactivado}
                    aria-label={t`Abrir calendário`}
                    className="pointer-events-auto -mr-1 rounded-controlo p-1 hover:text-texto-1"
                  >
                    <CalendarDays aria-hidden className="stroke-[1.5]" />
                  </Popover.Trigger>
                }
              />
            </div>
          </Popover.Anchor>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="z-50 rounded-cartao bg-superficie shadow-flutuante ring-1 ring-linha"
            >
              <Calendario
                seleccao={{ inicio: deDataCivil(valor) }}
                aoEscolher={escolher}
                minimo={min}
                maximo={max}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </Campo>
  )
}

interface PropsPeriodo {
  rotulo: string
  valor: { inicio: string | null; fim: string | null }
  aoMudar: (valor: { inicio: string | null; fim: string | null }) => void
  minimo?: string
  maximo?: string
  erro?: string
}

/** Selector de período: primeiro clique escolhe o início, o segundo o fim. */
export function SelectorPeriodo({ rotulo, valor, aoMudar, minimo, maximo, erro }: PropsPeriodo) {
  const { t } = useLingui()
  const [aberto, setAberto] = useState(false)
  const inicio = deDataCivil(valor.inicio)
  const fim = deDataCivil(valor.fim)

  function escolher(dia: Date) {
    if (!inicio || fim || isBefore(dia, inicio)) {
      aoMudar({ inicio: paraDataCivil(dia), fim: null })
      return
    }
    aoMudar({ inicio: valor.inicio, fim: paraDataCivil(dia) })
    setAberto(false)
  }

  const textoInicio = mostrar(valor.inicio)
  const resumo =
    inicio && fim
      ? `${mostrar(valor.inicio)} – ${mostrar(valor.fim)}`
      : inicio
        ? t`${textoInicio} – escolha o fim`
        : t`Escolher período`

  return (
    <Campo rotulo={rotulo} erro={erro}>
      {(controlo) => (
        <Popover.Root open={aberto} onOpenChange={setAberto}>
          <Popover.Trigger
            {...controlo}
            className="tabular flex h-9 w-full items-center justify-between gap-2 rounded-controlo bg-superficie px-3 text-left text-corpo ring-1 ring-contorno ring-inset focus-visible:ring-2 focus-visible:ring-acento focus-visible:outline-none"
          >
            <span className={inicio ? 'text-texto-1' : 'text-texto-3'}>{resumo}</span>
            <CalendarDays aria-hidden className="size-4 stroke-[1.5] text-texto-3" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="z-50 rounded-cartao bg-superficie shadow-flutuante ring-1 ring-linha"
            >
              <Calendario
                seleccao={{ inicio, fim }}
                aoEscolher={escolher}
                minimo={deDataCivil(minimo)}
                maximo={deDataCivil(maximo)}
              />
              {inicio && !fim && (
                <p className="px-3 pb-3 text-secundario text-texto-3">
                  <Trans>Escolha o último dia do período.</Trans>
                </p>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </Campo>
  )
}
