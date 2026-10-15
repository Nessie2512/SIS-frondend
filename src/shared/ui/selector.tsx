import { Trans, useLingui } from '@lingui/react/macro'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { TEMPOS } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import { IndicadorPontual } from './progresso'

export interface OpcaoSelector {
  valor: string
  rotulo: string
  descricao?: string
  desactivada?: boolean
}

interface PropsComuns {
  id?: string
  opcoes: OpcaoSelector[]
  placeholder?: string
  desactivado?: boolean
  /** A carregar opções (selector assíncrono) */
  aCarregar?: boolean
  /** Assíncrono: a pesquisa vai ao servidor; espera 120 ms entre teclas (guia 5.6) */
  aoPesquisar?: (texto: string) => void
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

type Props =
  | (PropsComuns & {
      multiplo?: false
      valor: string | null
      aoMudar: (valor: string | null) => void
    })
  | (PropsComuns & { multiplo: true; valor: string[]; aoMudar: (valor: string[]) => void })

/**
 * Selector e caixa de pesquisa com sugestões (guia 6.2): simples, múltiplo e assíncrono;
 * estados a carregar e sem resultados. Usar dentro de <Campo> para ter etiqueta e erro.
 */
export function Selector(props: Props) {
  const { t } = useLingui()
  const { id, opcoes, placeholder, desactivado, aCarregar, aoPesquisar } = props
  const [aberto, setAberto] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  // Ref e não estado: com teclas mais rápidas do que as renderizações, um estado desactualizado
  // deixava temporizadores antigos por cancelar
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(espera.current), [])

  const seleccionados = props.multiplo ? props.valor : props.valor ? [props.valor] : []
  const rotulos = opcoes.filter((o) => seleccionados.includes(o.valor)).map((o) => o.rotulo)
  const quantos = rotulos.length
  const resumo =
    rotulos.length === 0
      ? (placeholder ?? t`Escolher`)
      : rotulos.length <= 2
        ? rotulos.join(', ')
        : t`${quantos} seleccionados`

  function escolher(valor: string) {
    if (props.multiplo) {
      const proximo = props.valor.includes(valor)
        ? props.valor.filter((v) => v !== valor)
        : [...props.valor, valor]
      props.aoMudar(proximo)
    } else {
      props.aoMudar(valor === props.valor ? null : valor)
      setAberto(false)
    }
  }

  function aoEscrever(texto: string) {
    setPesquisa(texto)
    if (!aoPesquisar) return
    clearTimeout(espera.current)
    espera.current = setTimeout(() => aoPesquisar(texto), TEMPOS.pesquisaEspera)
  }

  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger
        id={id}
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-describedby={props['aria-describedby']}
        aria-invalid={props['aria-invalid']}
        aria-required={props['aria-required']}
        disabled={desactivado}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-controlo bg-superficie px-3 text-left text-corpo ring-1 ring-contorno ring-inset',
          'focus-visible:ring-2 focus-visible:ring-acento focus-visible:outline-none aria-invalid:ring-2 aria-invalid:ring-perigo',
          'disabled:cursor-not-allowed disabled:opacity-50',
          rotulos.length === 0 && 'text-texto-3',
        )}
      >
        <span className="truncate">{resumo}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 stroke-[1.5] text-texto-3" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-cartao bg-superficie shadow-flutuante ring-1 ring-linha data-[state=open]:animate-desvanecer-entrar"
        >
          <Command shouldFilter={!aoPesquisar} loop>
            <Command.Input
              value={pesquisa}
              onValueChange={aoEscrever}
              placeholder={t`Pesquisar`}
              className="h-9 w-full border-b border-linha bg-transparent px-3 text-corpo outline-none placeholder:text-texto-3"
            />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              {aCarregar && (
                <Command.Loading>
                  <div className="flex items-center gap-2 px-2 py-2 text-secundario text-texto-3">
                    <IndicadorPontual /> <Trans>A carregar opções</Trans>
                  </div>
                </Command.Loading>
              )}
              {!aCarregar && (
                <Command.Empty className="px-2 py-3 text-secundario text-texto-3">
                  <Trans>Sem resultados.</Trans>
                </Command.Empty>
              )}
              {opcoes.map((opcao) => {
                const marcado = seleccionados.includes(opcao.valor)
                return (
                  <Command.Item
                    key={opcao.valor}
                    value={opcao.valor}
                    keywords={[opcao.rotulo, opcao.descricao ?? '']}
                    disabled={opcao.desactivada}
                    onSelect={() => escolher(opcao.valor)}
                    className="flex cursor-default items-center gap-2 rounded-controlo px-2 py-1.5 text-corpo data-[disabled=true]:opacity-50 data-[selected=true]:bg-fundo"
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0 stroke-[1.5] text-acento',
                        !marcado && 'invisible',
                      )}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{opcao.rotulo}</span>
                      {opcao.descricao && (
                        <span className="truncate text-secundario text-texto-3">
                          {opcao.descricao}
                        </span>
                      )}
                    </span>
                  </Command.Item>
                )
              })}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
