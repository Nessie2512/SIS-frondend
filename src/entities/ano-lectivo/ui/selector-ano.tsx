import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { cn } from '@/shared/lib/cn'
import { EtiquetaEstado } from '@/shared/ui'
import { anosLectivosQuery } from '../api/queries'
import { useContextoAno } from '../model/contexto'
import type { EstadoAnoLectivo } from '../model/tipos'

const TOM: Record<EstadoAnoLectivo, 'sucesso' | 'neutra' | 'aviso'> = {
  EM_CURSO: 'sucesso',
  PLANEADO: 'neutra',
  ENCERRADO: 'aviso',
}

/**
 * Selector do ano lectivo (guia 2.5, 6.3): cápsula no cabeçalho com o ano em contexto e o
 * seu estado. Mudar de ano mantém a rota e recarrega os dados.
 */
export function SelectorAno() {
  const { t } = useLingui()
  const router = useRouter()
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const anoLectivoId = useContextoAno((e) => e.anoLectivoId)
  const escolher = useContextoAno((e) => e.escolher)
  const actual = anos.find((a) => a.id === anoLectivoId)
  const designacao = actual?.designacao
  const estado = actual?.estadoRotulo

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={
          actual ? t`Ano lectivo ${designacao}, ${estado}. Mudar de ano` : t`Escolher ano lectivo`
        }
        className="flex h-8 items-center gap-2 rounded-full bg-fundo pr-2 pl-3 text-secundario ring-1 ring-linha hover:ring-contorno data-[state=open]:ring-contorno"
      >
        <span className="tabular font-medium text-texto-1">{actual?.designacao ?? '—'}</span>
        {actual && <EtiquetaEstado tom={TOM[actual.estado]}>{actual.estadoRotulo}</EtiquetaEstado>}
        <ChevronDown aria-hidden className="size-4 stroke-[1.5] text-texto-3" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-cartao bg-superficie p-1 shadow-flutuante ring-1 ring-linha data-[state=open]:animate-desvanecer-entrar"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-legenda text-texto-3">{t`Ano lectivo`}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={anoLectivoId ?? ''}
            onValueChange={(id) => {
              escolher(id)
              void router.invalidate()
            }}
          >
            {anos.map((ano) => (
              <DropdownMenu.RadioItem
                key={ano.id}
                value={ano.id}
                className={cn(
                  'flex cursor-default items-center gap-2 rounded-controlo px-2 py-1.5 text-corpo outline-none',
                  'data-highlighted:bg-fundo',
                )}
              >
                <span className="flex size-4 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-4 stroke-[1.5] text-acento" />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span className="tabular flex-1">{ano.designacao}</span>
                <EtiquetaEstado tom={TOM[ano.estado]}>{ano.estadoRotulo}</EtiquetaEstado>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
