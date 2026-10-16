import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Lock } from 'lucide-react'
import * as z from 'zod/mini'
import {
  documentosQuery,
  encarregadosQuery,
  estudanteQuery,
  EtiquetaEstadoEstudante,
  formatarTelefone,
  percursoQuery,
} from '@/entities/estudante'
import { CartaoMatricula } from '@/features/confirmar-matricula'
import { DadosEstudante } from '@/features/editar-estudante'
import { ListaDocumentos } from '@/features/marcar-documento'
import { eApiError } from '@/shared/api'
import { TEMPOS } from '@/shared/config/constantes'
import { formatarInstante } from '@/shared/lib/datas'
import {
  Avatar,
  ErroDeRota,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  ListaSeparadores,
  PainelSeparador,
  Separador,
  Separadores,
} from '@/shared/ui'

const SEPARADORES = [
  'resumo',
  'percurso',
  'documentos',
  'encarregados',
  'ocorrencias',
  'oficiais',
] as const

export const Route = createFileRoute('/_app/estudantes/$estudanteId')({
  // O separador activo vive no URL: a ficha pode ser partilhada já no separador certo (guia 4.2)
  validateSearch: z.object({
    separador: z.catch(z._default(z.enum(SEPARADORES), 'resumo'), 'resumo'),
  }),
  loader: async ({ context: { queryClient }, params: { estudanteId } }) => {
    try {
      await queryClient.ensureQueryData(estudanteQuery(estudanteId))
    } catch (erro) {
      if (eApiError(erro) && erro.status === 404) throw notFound()
      throw erro
    }
  },
  pendingComponent: FichaEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  notFoundComponent: EstudanteInexistente,
  component: FichaEstudante,
})

/** Ficha do estudante (guia 6.3): cabeçalho com fotografia, nome, processo e estado; seis separadores. */
function FichaEstudante() {
  const { t } = useLingui()
  const { estudanteId } = Route.useParams()
  const { separador } = Route.useSearch()
  const { soLeitura } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: e } = useQuery(estudanteQuery(estudanteId))
  const { data: documentos } = useQuery(documentosQuery(estudanteId))
  if (!e) return <FichaEsqueleto />
  const emFalta = e.documentosEmFalta
  const processo = e.numeroProcesso

  return (
    <article className="flex flex-col gap-6">
      <Link
        to="/estudantes"
        search={{ page: 1 }}
        className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
      >
        <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Estudantes</Trans>
      </Link>

      <header className="flex items-center gap-5">
        <Avatar nome={e.nome} fotografia={e.fotografiaUrl} tamanho="grande" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-titulo-pagina">{e.nome}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-secundario text-texto-2">
            <span className="tabular">{t`Processo ${processo}`}</span>
            <span aria-hidden>·</span>
            <span>{e.matricula ?? t`Sem matrícula neste ano`}</span>
            <EtiquetaEstadoEstudante estudante={e} />
            {e.matriculaPendente && (
              <EtiquetaEstado tom="accao">{t`Matrícula a confirmar`}</EtiquetaEstado>
            )}
          </p>
        </div>
      </header>

      <Separadores
        value={separador}
        onValueChange={(valor) =>
          void navigate({
            search: { separador: valor as (typeof SEPARADORES)[number] },
            replace: true,
          })
        }
      >
        <ListaSeparadores rotulo={t`Ficha do estudante`}>
          <Separador valor="resumo">
            <Trans>Resumo</Trans>
          </Separador>
          <Separador valor="percurso">
            <Trans>Percurso</Trans>
          </Separador>
          <Separador valor="documentos" contador={documentos ? emFalta || undefined : undefined}>
            <Trans>Documentos</Trans>
          </Separador>
          <Separador valor="encarregados">
            <Trans>Encarregados</Trans>
          </Separador>
          <Separador valor="ocorrencias">
            <Trans>Ocorrências</Trans>
          </Separador>
          <Separador valor="oficiais">
            <Trans>Documentos oficiais</Trans>
          </Separador>
        </ListaSeparadores>

        <PainelSeparador value="resumo" className="pt-6">
          <DadosEstudante estudante={e} soLeitura={soLeitura} />
        </PainelSeparador>
        <PainelSeparador value="percurso" className="pt-6">
          <Percurso estudanteId={estudanteId} />
        </PainelSeparador>
        <PainelSeparador value="documentos" className="pt-6">
          {documentos ? (
            <div className="flex flex-col gap-6">
              <CartaoMatricula estudante={e} documentos={documentos} soLeitura={soLeitura} />
              <ListaDocumentos
                estudanteId={estudanteId}
                documentos={documentos}
                soLeitura={soLeitura}
              />
            </div>
          ) : (
            <Esqueleto className="h-64 w-full" />
          )}
        </PainelSeparador>
        <PainelSeparador value="encarregados" className="pt-6">
          <Encarregados estudanteId={estudanteId} />
        </PainelSeparador>
        <PainelSeparador value="ocorrencias" className="pt-6">
          <EstadoVazio
            titulo={t`Sem ocorrências registadas.`}
            descricao={t`O registo de ocorrências chega numa próxima versão.`}
          />
        </PainelSeparador>
        <PainelSeparador value="oficiais" className="pt-6">
          <EstadoVazio
            titulo={t`Ainda não foram emitidos documentos oficiais.`}
            descricao={t`A emissão de declarações e certificados chega numa próxima versão.`}
          />
        </PainelSeparador>
      </Separadores>
    </article>
  )
}

/** Linha do tempo (guia 6.3): vertical, por ano lectivo; entradas imutáveis com cadeado discreto. */
function Percurso({ estudanteId }: { estudanteId: string }) {
  const { t } = useLingui()
  const { data: eventos } = useQuery(percursoQuery(estudanteId))
  if (!eventos) return <Esqueleto className="h-48 w-full" />
  if (!eventos.length) return <EstadoVazio titulo={t`Ainda não há registos no percurso.`} />

  const porAno = new Map<string, typeof eventos>()
  for (const evento of eventos)
    porAno.set(evento.anoLectivo, [...(porAno.get(evento.anoLectivo) ?? []), evento])
  return (
    <div className="flex flex-col gap-8">
      {[...porAno].map(([ano, doAno]) => (
        <section key={ano} aria-labelledby={`ano-${ano}`}>
          <h2 id={`ano-${ano}`} className="tabular mb-3 text-subtitulo">
            {ano}
          </h2>
          <ol className="relative flex flex-col gap-5 border-l border-linha pl-6">
            {doAno.map((evento) => (
              <li key={evento.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-acento ring-4 ring-fundo"
                />
                <p className="flex items-center gap-2 font-medium">
                  {evento.tipoRotulo}
                  <Lock
                    aria-label={t`Registo imutável`}
                    className="size-3 stroke-[1.5] text-texto-3"
                  />
                </p>
                <p className="text-texto-2">{evento.descricao}</p>
                <p className="tabular text-secundario text-texto-3">
                  {formatarInstante(evento.data)} · {evento.autor}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Encarregados({ estudanteId }: { estudanteId: string }) {
  const { t } = useLingui()
  const { data: encarregados } = useQuery(encarregadosQuery(estudanteId))
  if (!encarregados) return <Esqueleto className="h-32 w-full" />
  if (!encarregados.length) return <EstadoVazio titulo={t`Sem encarregados registados.`} />
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {encarregados.map((enc) => {
        const outros = enc.outrosEducandos
        return (
          <li
            key={enc.id}
            className="flex flex-col gap-1 rounded-cartao bg-superficie p-4 ring-1 ring-linha"
          >
            <p className="flex items-center gap-2 text-subtitulo">
              {enc.nome}
              {enc.principal && <EtiquetaEstado tom="accao">{t`Principal`}</EtiquetaEstado>}
            </p>
            <p className="text-texto-2">{enc.parentesco}</p>
            <p className="tabular">{formatarTelefone(enc.telefone)}</p>
            {enc.email && <p className="text-texto-2">{enc.email}</p>}
            {outros > 0 && (
              <p className="text-secundario text-texto-3">
                {outros === 1
                  ? t`Encarregado de mais 1 estudante.`
                  : t`Encarregado de mais ${outros} estudantes.`}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function FichaEsqueleto() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex items-center gap-5">
        <Esqueleto className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-[34px] w-72" />
          <Esqueleto className="h-4 w-48" />
        </div>
      </div>
      <Esqueleto className="h-9 w-full" />
      <Esqueleto className="h-64 w-full" />
    </div>
  )
}

function EstudanteInexistente() {
  const { t } = useLingui()
  return (
    <EstadoVazio
      variante="sem-resultados"
      titulo={t`Este estudante não existe ou foi removido.`}
      accao={
        <Link to="/estudantes" search={{ page: 1 }} className="text-acento">
          <Trans>Voltar aos estudantes</Trans>
        </Link>
      }
    />
  )
}
