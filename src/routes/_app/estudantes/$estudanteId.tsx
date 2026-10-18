import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Printer } from 'lucide-react'
import * as z from 'zod/mini'
import { documentosQuery, estudanteQuery, EtiquetaEstadoEstudante } from '@/entities/estudante'
import { CartaoMatricula } from '@/features/confirmar-matricula'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { DadosEstudante } from '@/features/editar-estudante'
import { DocumentosOficiais } from '@/features/emitir-documento'
import { EncarregadosEstudante } from '@/features/gerir-encarregados'
import { MatricularExistente } from '@/features/matricular-existente'
import { MenuSituacao } from '@/features/mudar-situacao'
import { TransferirEstudante } from '@/features/transferir-estudante'
import { PercursoEstudante } from '@/features/rectificar-percurso'
import { OcorrenciasEstudante } from '@/features/registar-ocorrencia'
import { ListaDocumentos } from '@/features/marcar-documento'
import { eApiError } from '@/shared/api'
import { TEMPOS } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import {
  Avatar,
  Button,
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
  const podeRectificar = useCan('estudantes:escrever') // também registar ocorrências
  const podeEmitir = useCan('documentos:emitir')
  const podeMatricular = useCan('matriculas:escrever')
  const { anoLectivoId } = Route.useRouteContext()
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const ano = anos.find((a) => a.id === anoLectivoId)
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

      <header className="flex flex-wrap items-center gap-5">
        <Avatar nome={e.nome} fotografia={e.fotografiaUrl} tamanho="grande" />
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <h1 className="text-titulo-pagina">{e.nome}</h1>
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
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {podeRectificar && !soLeitura && e.estado === 'ACTIVO' && (
            <TransferirEstudante estudante={e} />
          )}
          {podeRectificar && !soLeitura && <MenuSituacao estudante={e} />}
          <Button asChild>
            <Link to="/imprimir/estudante/$estudanteId" params={{ estudanteId }}>
              <Printer aria-hidden className="size-4 stroke-[1.5]" />
              <Trans>Imprimir ficha</Trans>
            </Link>
          </Button>
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

        <PainelSeparador value="resumo" className="flex flex-col gap-6 pt-6">
          {e.estado === 'ACTIVO' && !e.matriculaId && !soLeitura && podeMatricular && ano && (
            <MatricularExistente
              estudante={e}
              anoLectivoId={ano.id}
              designacaoAno={ano.designacao}
            />
          )}
          <DadosEstudante estudante={e} soLeitura={soLeitura} />
        </PainelSeparador>
        <PainelSeparador value="percurso" className="pt-6">
          <PercursoEstudante
            estudanteId={estudanteId}
            podeRectificar={podeRectificar && !soLeitura}
          />
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
          <EncarregadosEstudante
            estudanteId={estudanteId}
            nome={e.nome}
            podeEditar={podeRectificar && !soLeitura}
          />
        </PainelSeparador>
        <PainelSeparador value="ocorrencias" className="pt-6">
          <OcorrenciasEstudante
            estudanteId={estudanteId}
            nome={e.nome}
            podeRegistar={podeRectificar && !soLeitura}
          />
        </PainelSeparador>
        <PainelSeparador value="oficiais" className="pt-6">
          <DocumentosOficiais estudanteId={estudanteId} nome={e.nome} podeEmitir={podeEmitir} />
        </PainelSeparador>
      </Separadores>
    </article>
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
