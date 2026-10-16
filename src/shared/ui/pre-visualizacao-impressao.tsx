import { Trans } from '@lingui/react/macro'
import { Printer } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Button } from './button'

interface Props {
  /** Título do documento (fica também no título da janela, que é o nome do PDF ao guardar) */
  titulo: string
  /** Ligação de regresso ao ecrã de origem */
  voltar: ReactNode
  children: ReactNode
}

/**
 * Pré-visualização de impressão (guia 7.6): uma folha A4 no ecrã, igual ao que sai da
 * impressora, com a barra de acções fora do papel. Imprimir usa o diálogo do navegador
 * (que também guarda em PDF).
 */
export function PreVisualizacaoImpressao({ titulo, voltar, children }: Props) {
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
      <div className="-mx-6 overflow-x-auto bg-fundo px-6 pb-8 print:m-0 print:overflow-visible print:p-0">
        <article
          aria-label={titulo}
          className="papel mx-auto flex min-h-[297mm] w-[210mm] flex-col gap-6 rounded-[2px] p-[15mm] text-[10.5pt] shadow-elevado ring-1 ring-linha"
        >
          {children}
        </article>
      </div>
    </div>
  )
}

/** Cabeçalho comum dos documentos impressos: escola, título e referência. */
export function CabecalhoImpressao({
  titulo,
  subtitulo,
  referencia,
}: {
  titulo: string
  subtitulo?: string
  referencia?: ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-6 border-b-2 border-texto-1 pb-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-legenda tracking-wide text-texto-2 uppercase">
          <Trans>Secretaria escolar</Trans>
        </p>
        <h2 className="text-[16pt] leading-tight font-semibold">{titulo}</h2>
        {subtitulo && <p className="text-texto-2">{subtitulo}</p>}
      </div>
      {referencia && <div className="text-right text-secundario text-texto-2">{referencia}</div>}
    </header>
  )
}
