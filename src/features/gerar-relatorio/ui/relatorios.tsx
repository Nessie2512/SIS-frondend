import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { classesQuery } from '@/entities/classe'
import { catalogoQuery, exportacoesQuery, type Relatorio } from '@/entities/relatorio'
import { turmasQuery } from '@/entities/turma'
import { anunciar } from '@/shared/lib/anunciar'
import { formatarInstante } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  BarraProgresso,
  Button,
  Campo,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  notificar,
  Selector,
} from '@/shared/ui'
import { useGerarRelatorio } from '../model/use-gerar-relatorio'

/** Catálogo de relatórios (guia 2.5): cada um diz o que contém e pede só o parâmetro necessário. */
export function CatalogoRelatorios({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const { data: catalogo } = useQuery(catalogoQuery())
  if (!catalogo) return <Esqueleto className="h-64 w-full" />
  return (
    <section aria-labelledby="catalogo-titulo" className="flex flex-col gap-3">
      <h2 id="catalogo-titulo" className="text-titulo-seccao">
        <Trans>Catálogo</Trans>
      </h2>
      <ul aria-label={t`Relatórios disponíveis`} className="grid gap-4 md:grid-cols-2">
        {catalogo.map((r) => (
          <li key={r.tipo}>
            <CartaoRelatorio relatorio={r} anoLectivoId={anoLectivoId} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CartaoRelatorio({
  relatorio,
  anoLectivoId,
}: {
  relatorio: Relatorio
  anoLectivoId: string
}) {
  const { t } = useLingui()
  const gerar = useGerarRelatorio()
  const [valor, setValor] = useState<string | null>(null)
  const [erro, setErro] = useState<string>()
  const { data: classes = [] } = useQuery({
    ...classesQuery(),
    enabled: relatorio.parametro === 'CLASSE',
  })
  const { data: turmas } = useQuery({
    ...turmasQuery({ anoLectivoId, estado: 'ACTIVA', page: 1 }),
    enabled: relatorio.parametro === 'TURMA',
  })
  const titulo = relatorio.titulo
  const idTitulo = `relatorio-${relatorio.tipo}`

  function pedir() {
    if (relatorio.parametroObrigatorio && !valor) {
      return setErro(relatorio.parametro === 'TURMA' ? t`Escolha a turma.` : t`Escolha a classe.`)
    }
    gerar.mutate(
      {
        tipo: relatorio.tipo,
        anoLectivoId,
        turmaId: relatorio.parametro === 'TURMA' ? (valor ?? undefined) : undefined,
        classeId: relatorio.parametro === 'CLASSE' ? (valor ?? undefined) : undefined,
      },
      {
        onSuccess: () => anunciar.educado(t`${titulo}: a gerar. Acompanhe no quadro de tarefas.`),
        onError: (e) => notificar.erro(mensagemDeErro(e)),
      },
    )
  }

  return (
    <article
      aria-labelledby={idTitulo}
      className="flex h-full flex-col gap-3 rounded-cartao bg-superficie p-4 ring-1 ring-linha"
    >
      <div className="flex items-start gap-3">
        <FileSpreadsheet aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-acento" />
        <div className="flex flex-col gap-1">
          <h3 id={idTitulo} className="text-subtitulo">
            {titulo}
          </h3>
          <p className="text-secundario text-texto-2">{relatorio.descricao}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-end gap-3">
        {relatorio.parametro && (
          <Campo
            rotulo={relatorio.parametro === 'TURMA' ? t`Turma` : t`Classe`}
            erro={erro}
            obrigatorio={relatorio.parametroObrigatorio}
            className="w-48"
          >
            {(c) => (
              <Selector
                {...c}
                placeholder={relatorio.parametroObrigatorio ? t`Escolher` : t`Todas`}
                opcoes={
                  relatorio.parametro === 'TURMA'
                    ? (turmas?.turmas ?? []).map((x) => ({ valor: x.id, rotulo: x.designacao }))
                    : classes.map((x) => ({ valor: x.id, rotulo: x.designacao }))
                }
                valor={valor}
                aoMudar={(v) => {
                  setValor(v)
                  setErro(undefined)
                }}
              />
            )}
          </Campo>
        )}
        <Button
          aCarregar={gerar.isPending}
          aria-label={t`Gerar: ${titulo}`}
          onClick={pedir}
          className={erro ? 'mb-6' : undefined}
        >
          <Trans>Gerar</Trans>
        </Button>
      </div>
    </article>
  )
}

/** Exportações recentes (guia 2.5: lista com o estado das tarefas). */
export function ExportacoesRecentes({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const { data: exportacoes } = useQuery(exportacoesQuery(anoLectivoId))
  return (
    <section aria-labelledby="exportacoes-titulo" className="flex flex-col gap-3">
      <h2 id="exportacoes-titulo" className="text-titulo-seccao">
        <Trans>Exportações recentes</Trans>
      </h2>
      {!exportacoes ? (
        <Esqueleto className="h-32 w-full" />
      ) : exportacoes.length === 0 ? (
        <EstadoVazio
          titulo={t`Ainda não pediu nenhum relatório neste ano.`}
          descricao={t`Os relatórios que pedir ficam aqui para descarregar.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
          <table className="w-full text-left text-corpo">
            <caption className="sr-only">{t`Exportações recentes`}</caption>
            <thead className="text-legenda text-texto-2">
              <tr className="border-b border-linha">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <Trans>Relatório</Trans>
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <Trans>Pedido em</Trans>
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <Trans>Estado</Trans>
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">
                    <Trans>Resultado</Trans>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {exportacoes.map((e) => {
                const titulo = e.titulo
                return (
                  <tr key={e.id} className="h-linha border-b border-linha last:border-0">
                    <td className="px-4 font-medium">{titulo}</td>
                    <td className="tabular px-4 text-texto-2">{formatarInstante(e.pedidoEm)}</td>
                    <td className="px-4">
                      {e.estado === 'EM_CURSO' ? (
                        <BarraProgresso rotulo={titulo} valor={e.progresso} className="w-32" />
                      ) : (
                        <EtiquetaEstado tom={e.estadoTom}>{e.estadoRotulo}</EtiquetaEstado>
                      )}
                    </td>
                    <td className="px-4 text-right">
                      {e.resultadoUrl && (
                        <a
                          href={e.resultadoUrl}
                          download
                          aria-label={t`Descarregar: ${titulo}`}
                          className="inline-flex items-center gap-1.5 text-secundario text-acento hover:underline"
                        >
                          <Download aria-hidden className="size-4 stroke-[1.5]" />
                          <Trans>Descarregar</Trans>
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
