import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { ciclosQuery } from '@/entities/classe'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  Campo,
  CamposPessoa,
  ControloSegmentado,
  Folha,
  notificar,
  ResumoErros,
  Selector,
} from '@/shared/ui'
import { camposPessoaEmFalta, PESSOA_VAZIA, type DadosPessoa } from '@/shared/lib/pessoa'
import {
  useCriarProfessor,
  type AreaFormacao,
  type Habilitacao,
  type NovoProfessor,
} from '../model/use-criar-professor'

const AREAS = {
  STEM: msg`Ciências e tecnologia`,
  BUSINESS: msg`Economia e gestão`,
  MEDICINE: msg`Saúde`,
  ARTS: msg`Artes e humanidades`,
} satisfies Record<AreaFormacao, unknown>

const HABILITACOES = {
  'High School Graduate': msg`Ensino médio`,
  'Technical School certificate': msg`Ensino técnico`,
  "Bachelor's degree": msg`Licenciatura`,
  "Master's degree": msg`Mestrado`,
  'Ph.D.': msg`Doutoramento`,
} satisfies Record<Habilitacao, unknown>

/** Campos do backend → campos do formulário, para pôr cada erro no sítio certo. */
const CAMPO_DO_SERVIDOR: Record<string, string> = {
  name: 'nome',
  birthDate: 'dataNascimento',
  nationality: 'nacionalidade',
  academicLevelId: 'cicloId',
  teacherField: 'area',
  educationalAttainment: 'habilitacao',
}

/** Novo professor (backend SIS: POST /teachers), em folha lateral (guia 7.3). */
export function NovoProfessor() {
  const { t, i18n } = useLingui()
  const criar = useCriarProfessor()
  const { data: ciclos = [] } = useQuery(ciclosQuery())
  const [aberta, setAberta] = useState(false)
  const [pessoa, setPessoa] = useState<DadosPessoa>(PESSOA_VAZIA)
  const [cicloId, setCicloId] = useState<string | null>(null)
  const [area, setArea] = useState<AreaFormacao | null>(null)
  const [habilitacao, setHabilitacao] = useState<Habilitacao | null>(null)
  const [supervisor, setSupervisor] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string>()

  const ROTULOS: Record<string, string> = {
    nome: t`Nome completo`,
    dataNascimento: t`Data de nascimento`,
    nacionalidade: t`Nacionalidade`,
    rua: t`Rua e número`,
    bairro: t`Bairro`,
    municipio: t`Município`,
    provincia: t`Província`,
    cicloId: t`Ciclo`,
    area: t`Área de formação`,
    habilitacao: t`Habilitação`,
  }
  const resumo = Object.entries(ROTULOS).flatMap(([campo, rotulo]) =>
    erros[campo] ? [{ campo, rotulo, mensagem: erros[campo] }] : [],
  )

  function limpar() {
    setPessoa(PESSOA_VAZIA)
    setCicloId(null)
    setArea(null)
    setHabilitacao(null)
    setSupervisor(false)
    setErros({})
    setErroGeral(undefined)
  }

  function gravar() {
    const locais: Record<string, string> = {}
    for (const campo of camposPessoaEmFalta(pessoa)) locais[campo] = t`Preencha este campo.`
    if (!cicloId) locais.cicloId = t`Escolha o ciclo.`
    if (!area) locais.area = t`Escolha a área de formação.`
    if (!habilitacao) locais.habilitacao = t`Escolha a habilitação.`
    setErros(locais)
    setErroGeral(undefined)
    if (Object.keys(locais).length || !cicloId || !area || !habilitacao) return
    const pedido: NovoProfessor = { ...pessoa, cicloId, area, habilitacao, supervisor }
    criar.mutate(pedido, {
      onSuccess: () => {
        const nome = pessoa.nome.trim()
        notificar.sucesso(t`${nome} registado.`)
        anunciar.educado(t`${nome} registado.`)
        setAberta(false)
        limpar()
      },
      onError: (e) => {
        const deCampo = eApiError(e) ? e.errors : []
        if (deCampo.length) {
          setErros(
            Object.fromEntries(
              deCampo.map((x) => [CAMPO_DO_SERVIDOR[x.campo] ?? x.campo, x.mensagem]),
            ),
          )
        } else setErroGeral(mensagemDeErro(e))
      },
    })
  }

  return (
    <>
      <Button variante="primario" data-atalho="novo" onClick={() => setAberta(true)}>
        <Plus aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Novo professor</Trans>
      </Button>
      <Folha
        aberta={aberta}
        aoMudar={setAberta}
        pendente={criar.isPending}
        titulo={t`Novo professor`}
        descricao={t`O número de agente é atribuído pelo servidor.`}
        rodape={
          <>
            <Button
              disabled={criar.isPending}
              onClick={() => {
                setAberta(false)
                limpar()
              }}
            >
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={criar.isPending} onClick={gravar}>
              <Trans>Registar professor</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
          <ResumoErros erros={resumo} />
          <CamposPessoa valor={pessoa} aoMudar={setPessoa} erros={erros} />
          <Campo rotulo={t`Ciclo`} erro={erros.cicloId} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={ciclos.map((x) => ({ valor: x.id, rotulo: x.designacao }))}
                valor={cicloId}
                aoMudar={setCicloId}
              />
            )}
          </Campo>
          <Campo rotulo={t`Área de formação`} erro={erros.area} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={Object.entries(AREAS).map(([valor, rotulo]) => ({
                  valor,
                  rotulo: i18n._(rotulo),
                }))}
                valor={area}
                aoMudar={(v) => setArea(v as AreaFormacao | null)}
              />
            )}
          </Campo>
          <Campo rotulo={t`Habilitação`} erro={erros.habilitacao} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={Object.entries(HABILITACOES).map(([valor, rotulo]) => ({
                  valor,
                  rotulo: i18n._(rotulo),
                }))}
                valor={habilitacao}
                aoMudar={(v) => setHabilitacao(v as Habilitacao | null)}
              />
            )}
          </Campo>
          <div className="flex flex-col gap-1.5">
            <span className="text-legenda text-texto-2">
              <Trans>Supervisor</Trans>
            </span>
            <ControloSegmentado
              rotulo={t`Supervisor`}
              valor={supervisor ? 'sim' : 'nao'}
              aoMudar={(v) => setSupervisor(v === 'sim')}
              opcoes={[
                { valor: 'nao', rotulo: t`Não` },
                { valor: 'sim', rotulo: t`Sim` },
              ]}
            />
          </div>
        </div>
      </Folha>
    </>
  )
}
