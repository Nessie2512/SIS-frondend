import { Trans, useLingui } from '@lingui/react/macro'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface EtiquetaFiltro {
  chave: string
  /** Ex.: «Classe» */
  nome: string
  /** Ex.: «7.ª classe» */
  valor: string
}

interface Props {
  etiquetas: EtiquetaFiltro[]
  aoRemover: (chave: string) => void
  aoLimpar: () => void
  className?: string
}

/**
 * Filtros aplicados como etiquetas removíveis (guia 7.1): por baixo da pesquisa, cada uma
 * retira-se com um clique; «Limpar filtros» retira todas.
 */
export function EtiquetasFiltro({ etiquetas, aoRemover, aoLimpar, className }: Props) {
  const { t } = useLingui()
  if (!etiquetas.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <ul aria-label={t`Filtros aplicados`} className="flex flex-wrap items-center gap-1.5">
        {etiquetas.map(({ chave, nome, valor }) => (
          <li
            key={chave}
            className="flex h-7 items-center gap-1 rounded-full bg-fundo pl-3 text-secundario ring-1 ring-contorno"
          >
            <span className="text-texto-2">{nome}:</span>
            <span className="max-w-48 truncate font-medium text-texto-1">{valor}</span>
            <button
              type="button"
              aria-label={t`Retirar o filtro ${nome}: ${valor}`}
              onClick={() => aoRemover(chave)}
              className="mr-0.5 flex size-6 items-center justify-center rounded-full text-texto-2 outline-none hover:bg-superficie hover:text-texto-1 focus-visible:ring-2 focus-visible:ring-acento"
            >
              <X aria-hidden className="size-3.5 stroke-[1.5]" />
            </button>
          </li>
        ))}
      </ul>
      {etiquetas.length > 1 && (
        <button
          type="button"
          onClick={aoLimpar}
          className="rounded-controlo px-1 text-secundario text-acento outline-none hover:underline focus-visible:ring-2 focus-visible:ring-acento"
        >
          <Trans>Limpar filtros</Trans>
        </button>
      )}
    </div>
  )
}
