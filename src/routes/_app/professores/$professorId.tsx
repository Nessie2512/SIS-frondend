import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, Lock } from 'lucide-react'
import * as z from 'zod/mini'
import { CargaLectiva, professorQuery, type Professor } from '@/entities/professor'
import { MenuEstadoProfessor } from '@/features/alterar-estado-professor'
import { eApiError } from '@/shared/api'
import { TEMPOS } from '@/shared/config/constantes'
import { Can } from '@/shared/lib/can'
import { formatarDataCivil } from '@/shared/lib/datas'
import { formatarTelefone } from '@/shared/lib/formatar'
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

const SEPARADORES = ['resumo', 'disciplinas', 'atribuicoes', 'documentos'] as const

export const Route = createFileRoute('/_app/professores/$professorId')({
  validateSearch: z.object({
    separador: z.catch(z._default(z.enum(SEPARADORES), 'resumo'), 'resumo'),
  }),
  loader: async ({ context: { queryClient, anoLectivoId }, params: { professorId } }) => {
    try {
      await queryClient.ensureQueryData(professorQuery(professorId, anoLectivoId ?? ''))
    } catch (erro) {
      if (eApiError(erro) && erro.status === 404) throw notFound()
      throw erro
    }
  },
  pendingComponent: FichaEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  notFoundComponent: ProfessorInexistente,
  component: FichaProfessor,
})

/** Ficha do professor (guia 2.5): disciplinas, carga lectiva no ano em contexto e documentos. */
function FichaProfessor() {
  const { t } = useLingui()
  const { professorId } = Route.useParams()
  const { separador } = Route.useSearch()
  const { anoLectivoId } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: p } = useQuery(professorQuery(professorId, anoLectivoId ?? ''))
  if (!p) return <FichaEsqueleto />
  const agente = p.numeroAgente
  const atribuicoes = p.atribuicoes.length

  return (
    <article className="flex flex-col gap-6">
      <Link
        to="/professores"
        search={{ page: 1 }}
        className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
      >
        <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Professores</Trans>
      </Link>

      <header className="flex flex-wrap items-center gap-5">
        <Avatar nome={p.nome} fotografia={p.fotografiaUrl} tamanho="grande" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-titulo-pagina">{p.nome}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-secundario text-texto-2">
            <span className="tabular">{t`Agente n.º ${agente}`}</span>
            <span aria-hidden>·</span>
            <span>{p.disciplinasTexto}</span>
            <EtiquetaEstado tom={p.estadoTom}>{p.estadoRotulo}</EtiquetaEstado>
          </p>
        </div>
        <Can permissao="professores:escrever">
          <MenuEstadoProfessor professor={p} anoLectivoId={anoLectivoId ?? ''} />
        </Can>
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
        <ListaSeparadores rotulo={t`Ficha do professor`}>
          <Separador valor="resumo">
            <Trans>Resumo</Trans>
          </Separador>
          <Separador valor="disciplinas">
            <Trans>Disciplinas</Trans>
          </Separador>
          <Separador valor="atribuicoes" contador={atribuicoes || undefined}>
            <Trans>Atribuições</Trans>
          </Separador>
          <Separador valor="documentos" contador={p.documentosEmFalta || undefined}>
            <Trans>Documentos</Trans>
          </Separador>
        </ListaSeparadores>

        <PainelSeparador value="resumo" className="pt-6">
          <Resumo professor={p} />
        </PainelSeparador>
        <PainelSeparador value="disciplinas" className="pt-6">
          <Disciplinas professor={p} />
        </PainelSeparador>
        <PainelSeparador value="atribuicoes" className="pt-6">
          <Atribuicoes professor={p} />
        </PainelSeparador>
        <PainelSeparador value="documentos" className="pt-6">
          <Documentos professor={p} />
        </PainelSeparador>
      </Separadores>
    </article>
  )
}

const classesTermo = 'text-texto-2'

function Resumo({ professor: p }: { professor: Professor }) {
  const { t } = useLingui()
  return (
    <dl className="grid max-w-2xl grid-cols-[13rem_1fr] gap-x-6 gap-y-4 text-corpo">
      <dt className={classesTermo}>{t`N.º de agente`}</dt>
      <dd className="tabular flex items-center gap-2">
        {p.numeroAgente}
        <Lock aria-label={t`Não se altera`} className="size-3 stroke-[1.5] text-texto-3" />
      </dd>
      <dt className={classesTermo}>{t`Habilitação`}</dt>
      <dd>{p.habilitacao}</dd>
      <dt className={classesTermo}>{t`Admitido em`}</dt>
      <dd className="tabular">{formatarDataCivil(p.dataAdmissao)}</dd>
      <dt className={classesTermo}>{t`Telefone`}</dt>
      <dd className="tabular">{formatarTelefone(p.telefone) ?? '—'}</dd>
      <dt className={classesTermo}>{t`Email`}</dt>
      <dd>{p.email ?? '—'}</dd>
      <dt className={classesTermo}>{t`Carga lectiva semanal`}</dt>
      <dd>
        <CargaLectiva professor={p} />
      </dd>
      <dt className={classesTermo}>{t`Novas atribuições`}</dt>
      <dd>{p.disponivel ? t`Disponível` : t`Indisponível enquanto não estiver activo`}</dd>
    </dl>
  )
}

function Disciplinas({ professor: p }: { professor: Professor }) {
  const { t } = useLingui()
  return (
    <ul className="flex max-w-2xl flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha">
      {p.disciplinas.map((d) => {
        const turmas = p.atribuicoes.filter((a) => a.disciplinaId === d.id).length
        const nome = d.nome
        return (
          <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="tabular w-10 text-legenda font-semibold text-texto-3">
                {d.sigla}
              </span>
              {nome}
            </span>
            <span className="tabular text-secundario text-texto-2">
              {turmas === 0
                ? t`Sem turmas este ano`
                : plural(turmas, { one: '# turma', other: '# turmas' })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Atribuicoes({ professor: p }: { professor: Professor }) {
  const { t } = useLingui()
  if (!p.atribuicoes.length) {
    return (
      <EstadoVazio
        titulo={t`Sem atribuições neste ano lectivo.`}
        descricao={
          p.disponivel
            ? t`As atribuições fazem-se por turma e disciplina.`
            : t`Só professores activos recebem novas atribuições.`
        }
      />
    )
  }
  const total = p.cargaLectiva
  return (
    <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
      <table className="w-full text-left text-corpo">
        <caption className="sr-only">{t`Atribuições no ano lectivo`}</caption>
        <thead className="text-legenda text-texto-2">
          <tr className="border-b border-linha">
            <th scope="col" className="px-4 py-2.5 font-medium">
              <Trans>Turma</Trans>
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              <Trans>Classe</Trans>
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              <Trans>Disciplina</Trans>
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              <Trans>Horas por semana</Trans>
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              <Trans>Desde</Trans>
            </th>
          </tr>
        </thead>
        <tbody>
          {p.atribuicoes.map((a) => (
            <tr key={a.id} className="h-linha border-b border-linha last:border-0">
              <td className="px-4 font-medium">
                <Link to="/turmas" search={{ turma: a.turmaId }} className="hover:text-acento">
                  {a.turma}
                </Link>
              </td>
              <td className="px-4 text-texto-2">{a.classe}</td>
              <td className="px-4">{a.disciplina}</td>
              <td className="tabular px-4 text-right">{a.horasSemanais}</td>
              <td className="tabular px-4 text-texto-2">{formatarDataCivil(a.desde)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-linha bg-fundo">
            <th scope="row" colSpan={3} className="px-4 py-2.5 text-left font-medium">
              <Trans>Total semanal</Trans>
            </th>
            <td className="tabular px-4 text-right font-medium">{total}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Documentos({ professor: p }: { professor: Professor }) {
  const { t } = useLingui()
  return (
    <ul className="flex max-w-2xl flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha">
      {p.documentos.map((d) => (
        <li key={d.tipo} className="flex items-center justify-between gap-4 px-4 py-3">
          <span>{d.rotulo}</span>
          {d.entregue ? (
            <span className="flex items-center gap-1.5 text-secundario text-texto-2">
              <Check aria-hidden className="size-4 stroke-[1.5] text-sucesso" />
              {t`Entregue`}
            </span>
          ) : (
            <EtiquetaEstado tom="aviso">{t`Em falta`}</EtiquetaEstado>
          )}
        </li>
      ))}
    </ul>
  )
}

function FichaEsqueleto() {
  const { t } = useLingui()
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label={t`A carregar a ficha`}>
      <Esqueleto className="h-5 w-24" />
      <div className="flex items-center gap-5">
        <Esqueleto className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-8 w-72" />
          <Esqueleto className="h-4 w-48" />
        </div>
      </div>
      <Esqueleto className="h-10 w-full" />
      <Esqueleto className="h-64 w-full" />
    </section>
  )
}

function ProfessorInexistente() {
  const { t } = useLingui()
  return (
    <EstadoVazio
      titulo={t`Este professor não existe.`}
      descricao={t`Pode ter sido escrito mal o endereço. Procure na lista de professores.`}
      accao={
        <Link to="/professores" search={{ page: 1 }} className="text-acento">
          <Trans>Ir para Professores</Trans>
        </Link>
      }
    />
  )
}
