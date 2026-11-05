import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { encarregadosQuery, estudanteQuery, formatarTelefone } from '@/entities/estudante'
import { turmaQuery } from '@/entities/turma'
import { eApiError } from '@/shared/api'
import { formatarDataCivil } from '@/shared/lib/datas'
import {
  CabecalhoImpressao,
  ErroDeRota,
  Esqueleto,
  EstadoVazio,
  PreVisualizacaoImpressao,
} from '@/shared/ui'
import { exigir } from '../../-acesso'

export const Route = createFileRoute('/_app/imprimir/estudante/$estudanteId')({
  beforeLoad: () => exigir('imprimirFicha'),
  loader: async ({ context: { queryClient }, params: { estudanteId } }) => {
    try {
      await Promise.all([
        queryClient.ensureQueryData(estudanteQuery(estudanteId)),
        queryClient.ensureQueryData(encarregadosQuery(estudanteId)),
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

/** Dado vindo do servidor, a negrito. */
function Valor({ children }: { children: ReactNode }) {
  return <strong>{children}</strong>
}

/** Junta os pedaços de uma frase, só os que têm dados: «a, b ou c». */
function Enumeracao({ itens, ou }: { itens: ReactNode[]; ou: string }) {
  return itens.map((item, i) => (
    <Fragment key={i}>
      {i > 0 && (i === itens.length - 1 ? ` ${ou} ` : ', ')}
      {item}
    </Fragment>
  ))
}

function Seccao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11pt] font-bold uppercase">{titulo}</h3>
      {children}
    </section>
  )
}

function Regra({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex break-inside-avoid flex-col gap-1">
      <h4 className="font-bold">{titulo}</h4>
      <ul className="flex list-disc flex-col gap-1 pl-8 text-justify">{children}</ul>
    </section>
  )
}

function Assinatura({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p>
        {rotulo}: <span className="inline-block w-[80mm] border-b border-current">&nbsp;</span>
      </p>
      <p>
        <Trans>Data: ____ / ____ / 20____</Trans>
      </p>
    </div>
  )
}

const classeParagrafo = 'indent-8 text-justify leading-relaxed'

/**
 * Ficha do estudante para imprimir (guia 7.6), no modelo da secretaria: termo de matrícula e de
 * aceitação do regulamento, em A4 ao alto. Os dados do estudante e do encarregado principal vêm
 * da ficha; o que o sistema não tem (ex.: BI do encarregado) fica numa linha para preencher.
 */
function FichaImpressa() {
  const { t } = useLingui()
  const { estudanteId } = Route.useParams()
  const { anoLectivoId } = Route.useRouteContext()
  const { data: e } = useQuery(estudanteQuery(estudanteId))
  const { data: encarregados } = useQuery(encarregadosQuery(estudanteId))
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const turmaId = e?.turmaId ?? null
  const { data: turma, isPending: aCarregarTurma } = useQuery({
    ...turmaQuery(turmaId ?? ''),
    enabled: Boolean(turmaId),
  })
  if (!e || !encarregados || (turmaId && aCarregarTurma)) {
    return <Esqueleto className="h-[60vh] w-full" />
  }

  const nome = e.nome
  const ano = anos.find((a) => a.id === anoLectivoId)?.designacao ?? ''
  const principal = encarregados.find((x) => x.principal) ?? encarregados[0]
  const alternativo = encarregados.find(
    (x) => x !== principal && x.telefone && x.telefone !== principal?.telefone,
  )

  // Só entra no termo o que o servidor tem: o que falta não aparece, nem como espaço a preencher
  const preenchido = (v: string | null | undefined): v is string => Boolean(v?.trim()) && v !== '—'
  const feminino = e.sexo === 'F'
  const estudante = <Valor>{nome}</Valor>
  const encarregado = principal && preenchido(principal.nome) ? principal : null
  const nomeEncarregado = <Valor>{encarregado?.nome}</Valor>
  const nascimento = <Valor>{formatarDataCivil(e.dataNascimento)}</Valor>
  const documento = <Valor>{e.documentoIdentificacao}</Valor>
  const codigo = <Valor>{e.numeroProcesso}</Valor>
  const textoTurma = turma
    ? `${turma.classe}, ${t`turma`} ${turma.designacao}`
    : preenchido(e.matricula)
      ? e.matricula
      : null
  const classeTurma = <Valor>{textoTurma}</Valor>
  const nomeDirector = turma?.directorTurma?.nome
  const director = <Valor>{nomeDirector}</Valor>
  const morada = <Valor>{e.morada}</Valor>
  const telefone = <Valor>{formatarTelefone(encarregado?.telefone ?? null)}</Valor>
  const telefoneAlternativo = <Valor>{formatarTelefone(alternativo?.telefone ?? null)}</Valor>
  const email = <Valor>{encarregado?.email}</Valor>

  // 1. Informação do estudante: uma oração por dado que existe
  const identificacao: ReactNode[] = [
    encarregado ? (
      feminino ? (
        <Trans key="enc">
          {nomeEncarregado} actua na qualidade de encarregado de educação da estudante {estudante}
        </Trans>
      ) : (
        <Trans key="enc">
          {nomeEncarregado} actua na qualidade de encarregado de educação do estudante {estudante}
        </Trans>
      )
    ) : feminino ? (
      <Trans key="enc">A estudante {estudante}</Trans>
    ) : (
      <Trans key="enc">O estudante {estudante}</Trans>
    ),
    feminino ? (
      <Trans key="sexo">do sexo feminino</Trans>
    ) : (
      <Trans key="sexo">do sexo masculino</Trans>
    ),
    feminino ? (
      <Trans key="nasc">nascida em {nascimento}</Trans>
    ) : (
      <Trans key="nasc">nascido em {nascimento}</Trans>
    ),
  ]
  if (preenchido(e.documentoIdentificacao))
    identificacao.push(
      feminino ? (
        <Trans key="doc">portadora do documento de identificação {documento}</Trans>
      ) : (
        <Trans key="doc">portador do documento de identificação {documento}</Trans>
      ),
    )
  const registo: ReactNode[] = []
  if (preenchido(e.numeroProcesso))
    registo.push(
      feminino ? (
        <Trans key="cod">registada com o código de estudante {codigo}</Trans>
      ) : (
        <Trans key="cod">registado com o código de estudante {codigo}</Trans>
      ),
    )
  if (textoTurma)
    registo.push(
      feminino ? (
        <Trans key="mat">matriculada em {classeTurma} no presente ano lectivo</Trans>
      ) : (
        <Trans key="mat">matriculado em {classeTurma} no presente ano lectivo</Trans>
      ),
    )

  // 2. Encarregado: contactos que existem, «telefone, alternativo ou e-mail»
  const contactos: ReactNode[] = []
  if (preenchido(encarregado?.telefone))
    contactos.push(<Trans key="tel">pelo telefone principal {telefone}</Trans>)
  if (preenchido(alternativo?.telefone))
    contactos.push(<Trans key="alt">pelo telefone alternativo {telefoneAlternativo}</Trans>)
  if (preenchido(encarregado?.email)) contactos.push(<Trans key="email">pelo e-mail {email}</Trans>)
  const ou = t`ou`

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
      <CabecalhoImpressao titulo={t`Termo de matrícula e de aceitação do regulamento escolar`} />
      {ano && (
        <p className="font-bold">
          <Trans>Ano lectivo: {ano}</Trans>
        </p>
      )}

      <Seccao titulo={t`1. Informação do estudante`}>
        <p className={classeParagrafo}>
          <Enumeracao itens={identificacao} ou={t`e`} />.
          {registo.length > 0 && (
            <>
              {' '}
              {feminino ? (
                <Trans>Com a assinatura deste termo, a estudante fica</Trans>
              ) : (
                <Trans>Com a assinatura deste termo, o estudante fica</Trans>
              )}{' '}
              <Enumeracao itens={registo} ou={t`e`} />
              {nomeDirector ? (
                <>
                  , <Trans>sob o acompanhamento pedagógico do director de turma {director}</Trans>
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </Seccao>

      {encarregado && (
        <Seccao titulo={t`2. Informação do encarregado de educação`}>
          <p className={classeParagrafo}>
            <Trans>
              Este termo diz respeito a {nomeEncarregado}, que actua em plena capacidade legal como
              encarregado de educação principal do estudante matriculado.
            </Trans>
          </p>
          {(preenchido(e.morada) || contactos.length > 0) && (
            <p className={classeParagrafo}>
              {preenchido(e.morada) && (
                <Trans>
                  O encarregado de educação principal tem residência permanente em {morada}.
                </Trans>
              )}
              {preenchido(e.morada) && contactos.length > 0 && ' '}
              {contactos.length > 0 && (
                <>
                  <Trans>
                    Para comunicações oficiais, avisos administrativos e correspondência corrente, a
                    administração da escola pode contactá-lo directamente
                  </Trans>{' '}
                  <Enumeracao itens={contactos} ou={ou} />.
                </>
              )}
            </p>
          )}
        </Seccao>
      )}

      <Seccao titulo={t`3. Regulamento escolar e código de conduta`}>
        <p className="text-justify">
          <Trans>
            Ao matricular o estudante acima identificado, o encarregado de educação abaixo assinado
            compromete-se a cumprir e apoiar as seguintes normas da escola:
          </Trans>
        </p>
        <Regra titulo={t`3.1 Assiduidade e pontualidade`}>
          <li>
            <Trans>
              Os estudantes devem chegar a horas a todas as aulas e actividades escolares agendadas.
            </Trans>
          </li>
          <li>
            <Trans>
              As justificações de faltas devem ser entregues por escrito ou pelos canais oficiais de
              comunicação até 24 horas depois da falta.
            </Trans>
          </li>
          <li>
            <Trans>
              As faltas injustificadas acima do limite definido pela direcção pedagógica podem dar
              lugar a medidas disciplinares ou afectar a avaliação.
            </Trans>
          </li>
        </Regra>
        <Regra titulo={t`3.2 Uniforme e apresentação pessoal`}>
          <li>
            <Trans>
              Os estudantes devem usar o uniforme escolar completo e limpo durante o horário escolar
              e nos eventos oficiais.
            </Trans>
          </li>
          <li>
            <Trans>
              A higiene e a apresentação pessoal devem seguir sempre as orientações da escola.
            </Trans>
          </li>
        </Regra>
        <Regra titulo={t`3.3 Disciplina e comportamento`}>
          <li>
            <Trans>
              É obrigatório o respeito pelos professores, pelo pessoal administrativo, pelos colegas
              e pelo património da escola.
            </Trans>
          </li>
          <li>
            <Trans>
              O bullying, o assédio físico ou verbal, a violência e a discriminação são estritamente
              proibidos e motivo de suspensão ou expulsão imediata.
            </Trans>
          </li>
          <li>
            <Trans>
              A desonestidade académica (cábula, plágio) implica a nota zero na prova e a análise
              disciplinar do caso.
            </Trans>
          </li>
        </Regra>
        <Regra titulo={t`3.4 Património e objectos pessoais`}>
          <li>
            <Trans>
              Os estudantes são responsáveis por conservar as instalações, o mobiliário e o material
              didáctico que a escola lhes disponibiliza. Os danos causados intencionalmente ou por
              negligência grave são cobrados ao encarregado de educação.
            </Trans>
          </li>
          <li>
            <Trans>
              A escola não se responsabiliza pela perda ou dano de objectos pessoais não autorizados
              (ex.: aparelhos electrónicos, jóias de valor). Os aparelhos electrónicos só podem ser
              usados com autorização expressa do professor.
            </Trans>
          </li>
        </Regra>
        <Regra titulo={t`3.5 Saúde e segurança`}>
          <li>
            <Trans>
              O encarregado de educação deve informar por escrito a administração da escola de
              qualquer doença preexistente, alergia ou medicação necessária.
            </Trans>
          </li>
          <li>
            <Trans>
              Em caso de emergência médica, a escola contacta de imediato o encarregado de educação
              e toma as medidas de emergência necessárias.
            </Trans>
          </li>
        </Regra>
        <Regra titulo={t`3.6 Compromissos financeiros`}>
          <li>
            <Trans>
              As propinas e taxas administrativas devem ser pagas segundo o calendário de pagamentos
              definido na matrícula.
            </Trans>
          </li>
          <li>
            <Trans>
              O incumprimento das obrigações financeiras no prazo pode restringir o acesso a
              documentos administrativos, provas ou à continuação da matrícula, nos termos da
              legislação educativa aplicável.
            </Trans>
          </li>
        </Regra>
      </Seccao>

      <Seccao titulo={t`4. Declaração e compromisso do encarregado de educação`}>
        <section className="flex break-inside-avoid flex-col gap-1">
          <p>
            <Trans>Eu, encarregado de educação abaixo assinado, confirmo que:</Trans>
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-8 text-justify">
            <li>
              <Trans>Os dados pessoais acima indicados estão correctos e completos.</Trans>
            </li>
            <li>
              <Trans>
                Li, compreendi e aceito as normas, o regulamento e as condições financeiras da
                escola acima descritas.
              </Trans>
            </li>
            <li>
              <Trans>
                Comprometo-me a orientar e apoiar o meu educando no cumprimento destas normas ao
                longo da matrícula.
              </Trans>
            </li>
          </ol>
        </section>
      </Seccao>

      <Seccao titulo={t`5. Assinaturas`}>
        <div className="flex break-inside-avoid flex-col gap-6">
          <Assinatura rotulo={t`Assinatura do encarregado de educação`} />
          <Assinatura rotulo={t`Assinatura do representante da escola`} />
        </div>
      </Seccao>
    </PreVisualizacaoImpressao>
  )
}
