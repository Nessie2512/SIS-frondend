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
            'papel mx-auto flex flex-col gap-5 rounded-[2px] font-documento text-[10.5pt] shadow-elevado ring-1 ring-linha',
            orientacao === 'paisagem'
              ? 'papel-paisagem min-h-[210mm] w-[297mm] p-[12mm]'
              : // Margens do modelo em Word: 10 mm em cima, 15 à direita, 12,5 à esquerda (em baixo
                // fica espaço para o rodapé)
                'min-h-[297mm] w-[210mm] pt-[10mm] pr-[15mm] pb-[14mm] pl-[12.5mm]',
          )}
        >
          {children}
          {/* No papel fica fixo no fundo e repete-se em todas as páginas (ver .rodape-documento) */}
          <footer className="rodape-documento mt-auto pt-4 text-center text-[8pt] text-texto-3">
            {ESCOLA.rodape}
          </footer>
        </article>
      </div>
    </div>
  )
}

/**
 * Papel timbrado da escola, medido sobre o modelo em Word (ENROLLMENT AGREEMENT AND SCHOOL RULES
 * ACKNOWLEDGMENT.docx): cada peça na mesma posição e tamanho, em milímetros a partir do canto da
 * área de texto (182,5 mm de largura, margens de 12,5 e 15 mm). Na folha deitada o bloco fica
 * centrado. Por baixo, o título do documento, como no modelo.
 */
export function CabecalhoImpressao({ titulo }: { titulo: string }) {
  const { t, i18n } = useLingui()
  const telefones = ESCOLA.telefones.join(', ')
  const base = import.meta.env.BASE_URL
  return (
    <header className="flex flex-col">
      <div className="relative mx-auto h-[37.7mm] w-[182.5mm] shrink-0">
        <img
          src={`${base}${ESCOLA.logotipo}`}
          alt={t`Logótipo da escola`}
          className="absolute top-0 left-[15.9mm] h-[26.3mm] w-[21.1mm]"
        />
        {/* Nome: caixa de 97,8 mm a 38,3 mm, Georgia 18 pt negrito, azul-escuro */}
        <p className="absolute top-[1.5mm] left-[38.3mm] w-[97.8mm] px-[2.54mm] text-center font-[Georgia,'Times_New_Roman',serif] text-[18pt] leading-[1.15] font-bold text-[#002060] uppercase">
          {ESCOLA.nome}
        </p>
        {/* Morada e telefones: caixa de 76,7 mm a 47,3 mm, Georgia 8 pt, vermelho-escuro */}
        <div className="absolute top-[12.2mm] left-[47.3mm] w-[76.7mm] px-[2.54mm] text-center font-[Georgia,'Times_New_Roman',serif] text-[8pt] leading-[1.14] text-[#c00000]">
          {ESCOLA.morada.map((linha) => (
            <p key={linha}>{linha}</p>
          ))}
          <p>{t`Telefone: ${telefones}`}</p>
        </div>
        {/* Linhas azuis (0,5 pt) que enquadram os níveis: vertical à esquerda e horizontal em baixo */}
        <span
          aria-hidden
          className="absolute top-0 left-[141.1mm] h-[26.2mm] border-l-[0.5pt] border-[#4472c4]"
        />
        <span
          aria-hidden
          className="absolute top-[26.2mm] left-[136.4mm] w-[33.4mm] border-t-[0.5pt] border-[#4472c4]"
        />
        {/* Níveis de ensino: Cambria 12 pt negrito, com o marcador de imagem do modelo */}
        <ul
          aria-label={t`Níveis de ensino`}
          className="absolute top-[1.3mm] left-[137.8mm] font-[Cambria,Georgia,serif] text-[12pt] leading-[1.26] font-bold whitespace-nowrap"
        >
          {ESCOLA.niveis.map((nivel) => (
            <li key={nivel.id} className="flex items-center">
              <img
                src={`${base}${ESCOLA.marcador}`}
                alt=""
                className="ml-[6.35mm] size-[11.25pt] shrink-0"
              />
              <span className="pl-[2.4mm]">{i18n._(nivel)}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Título: Georgia 11 pt negrito, centrado */}
      <h2 className="text-center font-[Georgia,'Times_New_Roman',serif] text-[11pt] leading-tight font-bold uppercase">
        {titulo}
      </h2>
    </header>
  )
}
