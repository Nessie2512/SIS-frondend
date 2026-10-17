import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  documentosQuery,
  encarregadosQuery,
  estudanteQuery,
  formatarTelefone,
  percursoQuery,
} from '@/entities/estudante'
import { meQuery } from '@/entities/utilizador'
import { eApiError } from '@/shared/api'
import { formatarDataCivil, formatarInstante } from '@/shared/lib/datas'
import {
  Avatar,
  CabecalhoImpressao,
  ErroDeRota,
  Esqueleto,
  EstadoVazio,
  PreVisualizacaoImpressao,
} from '@/shared/ui'

export const Route = createFileRoute('/_app/imprimir/estudante/$estudanteId')({
  loader: async ({ context: { queryClient }, params: { estudanteId } }) => {
    try {
      await Promise.all([
        queryClient.ensureQueryData(estudanteQuery(estudanteId)),
        queryClient.ensureQueryData(documentosQuery(estudanteId)),
        queryClient.ensureQueryData(encarregadosQuery(estudanteId)),
        queryClient.ensureQueryData(percursoQuery(estudanteId)),
      ])
    } catch (erro) {
      if (eApiError(erro) && erro.status === 404) throw notFound()
      throw erro
    }
  },
  errorComponent: ErroDeRota,
  notFoundComponent: () => (
    <EstadoVazio
      variante="sem-resultados"
      titulo={i18n._(msg`Este estudante não existe ou foi removido.`)}
    />
  ),
  component: FichaImpressa,
})

function Seccao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex break-inside-avoid flex-col gap-2">
      <h3 className="border-b border-linha pb-1 text-[11pt] font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

function Par({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <>
      <dt className="text-texto-2">{rotulo}</dt>
      <dd>{valor || '—'}</dd>
    </>
  )
}

/** Ficha do estudante para imprimir (guia 7.6): dados, encarregados, documentos e percurso. */
function FichaImpressa() {
  const { t } = useLingui()
  const { estudanteId } = Route.useParams()
  const { data: e } = useQuery(estudanteQuery(estudanteId))
  const { data: documentos } = useQuery(documentosQuery(estudanteId))
  const { data: encarregados } = useQuery(encarregadosQuery(estudanteId))
  const { data: percurso } = useQuery(percursoQuery(estudanteId))
  const { data: eu } = useQuery(meQuery())
  if (!e || !documentos || !encarregados || !percurso) {
    return <Esqueleto className="h-[60vh] w-full" />
  }

  const nome = e.nome
  const processo = e.numeroProcesso
  const emitida = formatarInstante(new Date())
  const autor = eu?.nome ?? ''
  const ESTADO_DOC = { ENTREGUE: t`Entregue`, EM_FALTA: t`Em falta`, DISPENSADO: t`Dispensado` }

  return (
    <PreVisualizacaoImpressao
      titulo={t`Ficha — ${nome}`}
      voltar={
        <Link
          to="/estudantes/$estudanteId"
          params={{ estudanteId }}
          className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
        >
          <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
          {nome}
        </Link>
      }
    >
      <CabecalhoImpressao
        titulo={t`Ficha do estudante`}
        referencia={<p className="tabular">{t`Processo ${processo}`}</p>}
      />

      <div className="flex items-start gap-5">
        <Avatar nome={e.nome} fotografia={e.fotografiaUrl} tamanho="grande" />
        <div className="flex flex-col gap-1">
          <p className="text-[14pt] font-semibold">{nome}</p>
          <p className="text-texto-2">
            {e.matricula ?? t`Sem matrícula neste ano`} · {e.estadoRotulo}
            {e.matriculaPendente ? ` · ${t`matrícula a confirmar`}` : ''}
          </p>
        </div>
      </div>

      <Seccao titulo={t`Dados pessoais`}>
        <dl className="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-1">
          <Par rotulo={t`Data de nascimento`} valor={formatarDataCivil(e.dataNascimento)} />
          <Par rotulo={t`Sexo`} valor={e.sexo === 'F' ? t`Feminino` : t`Masculino`} />
          <Par rotulo={t`Documento de identificação`} valor={e.documentoIdentificacao} />
          <Par rotulo={t`Naturalidade`} valor={e.naturalidade} />
          <Par rotulo={t`Morada`} valor={e.morada} />
          <Par rotulo={t`Telefone`} valor={e.telefone && formatarTelefone(e.telefone)} />
        </dl>
      </Seccao>

      <Seccao titulo={t`Encarregados de educação`}>
        {encarregados.length === 0 ? (
          <p className="text-texto-2">
            <Trans>Nenhum encarregado registado.</Trans>
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {encarregados.map((enc) => (
              <li key={enc.id}>
                <span className="font-medium">{enc.nome}</span>
                <span className="text-texto-2">
                  {' '}
                  · {enc.parentesco}
                  {enc.principal ? ` · ${t`principal`}` : ''} ·{' '}
                  <span className="tabular">{formatarTelefone(enc.telefone)}</span>
                  {enc.email ? ` · ${enc.email}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Seccao>

      <Seccao titulo={t`Documentos`}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t`Documentos de ${nome}`}</caption>
          <thead>
            <tr className="border-b border-linha text-legenda text-texto-2">
              <th scope="col" className="py-1 font-medium">
                <Trans>Documento</Trans>
              </th>
              <th scope="col" className="w-32 py-1 font-medium">
                <Trans>Estado</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id} className="border-b border-linha">
                <td className="py-1">
                  {d.designacao}
                  {d.obrigatorio && <span className="text-texto-3"> · {t`obrigatório`}</span>}
                </td>
                <td className={d.estado === 'EM_FALTA' ? 'py-1 font-medium' : 'py-1'}>
                  {ESTADO_DOC[d.estado]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Seccao>

      <Seccao titulo={t`Percurso`}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t`Percurso de ${nome}`}</caption>
          <thead>
            <tr className="border-b border-linha text-legenda text-texto-2">
              <th scope="col" className="w-24 py-1 font-medium">
                <Trans>Data</Trans>
              </th>
              <th scope="col" className="w-24 py-1 font-medium">
                <Trans>Ano</Trans>
              </th>
              <th scope="col" className="py-1 font-medium">
                <Trans>Registo</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {percurso.map((p) => (
              <tr key={p.id} className="border-b border-linha align-top">
                <td className="tabular py-1">{formatarDataCivil(p.data.slice(0, 10))}</td>
                <td className="tabular py-1">{p.anoLectivo}</td>
                <td className="py-1">
                  <span className="text-texto-2">{p.tipoRotulo}: </span>
                  {p.descricao}
                  {p.motivo && <span className="text-texto-3"> ({p.motivo})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Seccao>

      <footer className="mt-auto border-t border-linha pt-3 text-secundario text-texto-3">
        {t`Emitida em ${emitida} por ${autor}`}
      </footer>
    </PreVisualizacaoImpressao>
  )
}
