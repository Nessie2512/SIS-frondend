import { Trans, useLingui } from '@lingui/react/macro'
import { Printer } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { ESCOLA } from '@/shared/config/escola'
import { cn } from '@/shared/lib/cn'
import { Button } from './button'

interface Props {
  /** Título do documento (fica também no título da janela, que é o nome do PDF ao guardar) */
  titulo: string
  /** Ligação de regresso ao ecrã de origem */
  voltar: ReactNode
  /** Folha A4 ao alto (fichas) ou deitada (listas largas) */
  orientacao?: 'retrato' | 'paisagem'
  children: ReactNode
}

/**
 * Pré-visualização de impressão (guia 7.6): uma folha A4 no ecrã, igual ao que sai da
 * impressora, com a barra de acções fora do papel. Imprimir usa o diálogo do navegador
 * (que também guarda em PDF).
 */
export function PreVisualizacaoImpressao({
  titulo,
  voltar,
  orientacao = 'retrato',
  children,
}: Props) {
  const { t } = useLingui()
  useEffect(() => {
    const anterior = document.title
    document.title = titulo
    return () => {
      document.title = anterior
    }
  }, [titulo])

  return (
    <div className="flex flex-col gap-6">
      <div className="nao-imprimir flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          {voltar}
          <h1 className="text-titulo-pagina">
            <Trans>Pré-visualização</Trans>
          </h1>
          <p className="text-secundario text-texto-2">
            <Trans>
              A folha abaixo é o que vai ser impresso. Para PDF, escolha «Guardar como PDF».
            </Trans>
          </p>
        </div>
        <Button variante="primario" onClick={() => window.print()}>
          <Printer aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Imprimir</Trans>
        </Button>
      </div>
      {/* A folha deitada é mais larga que o ecrã: a área rola e, por isso, recebe o foco (teclado) */}
      <div
        role="region"
        aria-label={t`Folha a imprimir`}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- área que rola: o teclado tem de lá chegar (axe scrollable-region-focusable)
        tabIndex={0}
        className="-mx-6 overflow-x-auto bg-fundo px-6 pb-8 focus-visible:ring-2 focus-visible:ring-acento focus-visible:outline-none focus-visible:ring-inset print:m-0 print:overflow-visible print:p-0"
      >
        <article
          aria-label={titulo}
          className={cn(
            'papel mx-auto flex flex-col gap-5 rounded-[2px] p-[15mm] font-documento text-[10.5pt] shadow-elevado ring-1 ring-linha',
            orientacao === 'paisagem'
              ? 'papel-paisagem min-h-[210mm] w-[297mm]'
              : 'min-h-[297mm] w-[210mm]',
          )}
        >
          {children}
        </article>
      </div>
    </div>
  )
}

/** Marca dos níveis de ensino no papel timbrado (bandeira de quatro cores, como no modelo). */
function MarcaNivel() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="size-[2.6mm] shrink-0">
      <rect x="4" y="0" width="5" height="5" fill="#f5c400" />
      <rect x="0" y="4" width="5" height="4" fill="#f0607a" />
      <rect x="4" y="5" width="5" height="5" fill="#1d2bf0" />
      <path d="M5.5 0v10M1 6.8h9" stroke="#000" strokeWidth="1" />
    </svg>
  )
}

/**
 * Papel timbrado da escola, comum aos documentos impressos (modelos da secretaria): logótipo,
 * nome, morada e telefones ao centro, níveis de ensino à direita; por baixo, o título.
 */
export function CabecalhoImpressao({ titulo }: { titulo: string }) {
  const { t, i18n } = useLingui()
  const telefones = ESCOLA.telefones.join(', ')
  return (
    <header className="flex flex-col items-center gap-4">
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-6">
        <img
          src={`${import.meta.env.BASE_URL}${ESCOLA.logotipo}`}
          alt={t`Logótipo da escola`}
          className="h-[24mm] w-auto justify-self-center"
        />
        <div className="flex flex-col items-center text-center">
          <p className="text-[15pt] leading-tight font-bold tracking-wide text-[#0b2a6f] uppercase">
            {ESCOLA.nome}
          </p>
          <div className="mt-1 text-[7.5pt] leading-snug text-[#c00012]">
            {ESCOLA.morada.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
            <p>{t`Telefone: ${telefones}`}</p>
          </div>
        </div>
        <ul
          aria-label={t`Níveis de ensino`}
          className="flex flex-col gap-0.5 justify-self-start border-b border-l border-[#6b8ed6] pr-8 pb-3 pl-2 text-[8pt] font-bold"
        >
          {ESCOLA.niveis.map((nivel) => (
            <li key={nivel.id} className="flex items-center gap-1.5">
              <MarcaNivel />
              {i18n._(nivel)}
            </li>
          ))}
        </ul>
      </div>
      <h2 className="text-[13pt] leading-tight font-bold uppercase">{titulo}</h2>
    </header>
  )
}
