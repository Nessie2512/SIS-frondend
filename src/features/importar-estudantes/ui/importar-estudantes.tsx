import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, FileUp } from 'lucide-react'
import { useId, useState, type ChangeEvent } from 'react'
import { classesQuery } from '@/entities/classe'
import { tarefaQuery } from '@/entities/tarefa'
import { novaChaveIdempotencia } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { formatarDataCivil } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, BarraProgresso, Button, Esqueleto } from '@/shared/ui'
import { COLUNAS, MODELO_CSV, type Analise } from '../model/analisar'
import { analisarEmFundo } from '../model/analisar-em-fundo'
import { useImportarEstudantes } from '../model/use-importar'
import { useMensagensAnalise } from './mensagens'

const MODELO_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${MODELO_CSV}`)}`
const PRE_VISUALIZAR = 50

/**
 * Importar estudantes de um CSV (guia 2.1, 5.1, 5.6, 5.7): modelo para descarregar, análise
 * num Web Worker, pré-visualização com os erros por linha, confirmação e criação numa tarefa
 * em segundo plano, com avisos por linha no fim.
 */
export function ImportarEstudantes({
  anoLectivoId,
  designacaoAno,
}: {
  anoLectivoId: string
  designacaoAno: string
}) {
  const { t } = useLingui()
  const idFicheiro = useId()
  const { data: classes } = useQuery(classesQuery())
  const importar = useImportarEstudantes()
  const mensagens = useMensagensAnalise()
  const [ficheiro, setFicheiro] = useState<string>()
  const [analise, setAnalise] = useState<Analise>()
  const [aAnalisar, setAAnalisar] = useState(false)
  const [aceitoParcial, setAceitoParcial] = useState(false)
  const [chave, setChave] = useState(novaChaveIdempotencia)
  const [tarefaId, setTarefaId] = useState<string>()
  const [erro, setErro] = useState<string>()

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !classes) return
    setFicheiro(f.name)
    setAnalise(undefined)
    setAceitoParcial(false)
    setErro(undefined)
    setChave(novaChaveIdempotencia())
    setAAnalisar(true)
    try {
      const texto = await f.text()
      const activas = classes.filter((c) => c.activa)
      const r = await analisarEmFundo(texto, activas)
      setAnalise(r)
      const prontasLidas = r.validas.length
      const errosLidos = new Set(r.erros.map((x) => x.linha)).size
      anunciar.educado(
        r.erroFicheiro
          ? mensagens.ficheiro(r.erroFicheiro)
          : t`Ficheiro analisado: ${prontasLidas} linhas prontas, ${errosLidos} com erros.`,
      )
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setAAnalisar(false)
    }
  }

  function recomecar() {
    setFicheiro(undefined)
    setAnalise(undefined)
    setTarefaId(undefined)
    setAceitoParcial(false)
    setErro(undefined)
  }

  function confirmar() {
    if (!analise) return
    setErro(undefined)
    importar.mutate(
      { anoLectivoId, linhas: analise.validas, chave },
      {
        onSuccess: (tarefa) => {
          setTarefaId(tarefa.id)
          anunciar.educado(t`Importação iniciada. Pode continuar a trabalhar.`)
        },
        onError: (e) => setErro(mensagemDeErro(e)),
      },
    )
  }

  if (tarefaId) return <ResultadoImportacao tarefaId={tarefaId} aoRecomecar={recomecar} />

  const prontas = analise?.validas.length ?? 0
  const linhasComErro = new Set(analise?.erros.map((x) => x.linha)).size
  const temErros = linhasComErro > 0
  const podeImportar =
    Boolean(analise && !analise.erroFicheiro && prontas > 0) && (!temErros || aceitoParcial)
  const botao = plural(prontas, {
    one: 'Importar # estudante',
    other: 'Importar # estudantes',
  })

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="passo-modelo" className="flex flex-col gap-3">
        <h2 id="passo-modelo" className="text-titulo-seccao">
          <Trans>1. Preparar o ficheiro</Trans>
        </h2>
        <p className="max-w-prose text-texto-2">
          <Trans>
            Use o modelo: uma linha por estudante, separada por ponto e vírgula. Cada estudante fica
            com matrícula pendente em {designacaoAno}, sem turma, e os documentos em falta.
          </Trans>
        </p>
        <p className="text-secundario text-texto-2">
          <Trans>Colunas:</Trans>{' '}
          <span className="font-mono text-texto-1">{COLUNAS.join(';')}</span>
        </p>
        <Button asChild className="w-fit">
          <a href={MODELO_HREF} download="modelo-importacao-estudantes.csv">
            <Download aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Descarregar modelo</Trans>
          </a>
        </Button>
      </section>

      <section aria-labelledby="passo-ficheiro" className="flex flex-col gap-3">
        <h2 id="passo-ficheiro" className="text-titulo-seccao">
          <Trans>2. Escolher e rever</Trans>
        </h2>
        <label
          htmlFor={idFicheiro}
          className={cn(
            'flex w-fit cursor-pointer items-center gap-2 rounded-controlo bg-superficie px-3 py-2 ring-1 ring-linha',
            'hover:bg-fundo has-focus-visible:ring-2 has-focus-visible:ring-acento',
            !classes && 'pointer-events-none opacity-60',
          )}
        >
          <FileUp aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Ficheiro CSV</Trans>
          <input
            id={idFicheiro}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={!classes || aAnalisar}
            onChange={(e) => void escolher(e)}
          />
        </label>
        {ficheiro && (
          <p className="text-secundario text-texto-2">
            <span className="font-medium text-texto-1">{ficheiro}</span>
            {aAnalisar && <> · {t`a analisar…`}</>}
          </p>
        )}
        {aAnalisar && <Esqueleto className="h-32 w-full" />}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {analise?.erroFicheiro && (
          <Aviso tom="erro">{mensagens.ficheiro(analise.erroFicheiro)}</Aviso>
        )}
        {analise && !analise.erroFicheiro && (
          <PreVisualizacao analise={analise} linhasComErro={linhasComErro} />
        )}
      </section>

      {analise && !analise.erroFicheiro && (
        <section aria-labelledby="passo-confirmar" className="flex flex-col gap-3">
          <h2 id="passo-confirmar" className="text-titulo-seccao">
            <Trans>3. Confirmar</Trans>
          </h2>
          {prontas === 0 ? (
            <Aviso tom="aviso">
              <Trans>Nenhuma linha está pronta. Corrija o ficheiro e escolha-o de novo.</Trans>
            </Aviso>
          ) : (
            temErros && (
              <label className="flex max-w-prose cursor-pointer items-start gap-3 rounded-cartao p-3 ring-1 ring-linha">
                <input
                  type="checkbox"
                  checked={aceitoParcial}
                  onChange={(e) => setAceitoParcial(e.target.checked)}
                  className="mt-0.5 size-4 accent-(--color-acento)"
                />
                <span className="text-secundario">
                  {t`Importar só as ${prontas} linhas sem erros. As ${linhasComErro} com erros ficam de fora; corrija-as e importe-as depois.`}
                </span>
              </label>
            )
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variante="primario"
              disabled={!podeImportar}
              aCarregar={importar.isPending}
              onClick={confirmar}
            >
              {botao}
            </Button>
            <Button onClick={recomecar} disabled={importar.isPending}>
              <Trans>Escolher outro ficheiro</Trans>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function PreVisualizacao({ analise, linhasComErro }: { analise: Analise; linhasComErro: number }) {
  const { t } = useLingui()
  const mensagens = useMensagensAnalise()
  const total = analise.total
  const prontas = analise.validas.length
  const mostradas = Math.min(PRE_VISUALIZAR, prontas)
  return (
    <div className="flex flex-col gap-4">
      <p className="tabular" role="status">
        {t`${total} linhas: ${prontas} prontas a importar, ${linhasComErro} com erros.`}
      </p>
      {analise.erros.length > 0 && (
        <div className="overflow-x-auto rounded-cartao ring-1 ring-perigo/40">
          <table className="w-full text-secundario">
            <caption className="px-3 pt-3 text-left font-medium text-perigo">
              <Trans>Erros por linha</Trans>
            </caption>
            <thead className="text-left text-texto-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Linha</Trans>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Coluna</Trans>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Problema</Trans>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {analise.erros.map((e, i) => (
                <tr key={i}>
                  <td className="tabular px-3 py-2">{e.linha}</td>
                  <td className="px-3 py-2 font-mono">{e.campo}</td>
                  <td className="px-3 py-2">{mensagens.linha(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {prontas > 0 && (
        <div className="overflow-x-auto rounded-cartao ring-1 ring-linha">
          <table className="w-full text-secundario">
            <caption className="px-3 pt-3 text-left font-medium">
              {prontas > mostradas
                ? t`Linhas prontas (primeiras ${mostradas} de ${prontas})`
                : t`Linhas prontas`}
            </caption>
            <thead className="text-left text-texto-2">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Linha</Trans>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Nome</Trans>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Nascimento</Trans>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Classe</Trans>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  <Trans>Encarregado</Trans>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {analise.validas.slice(0, PRE_VISUALIZAR).map((l) => (
                <tr key={l.linha}>
                  <td className="tabular px-3 py-2">{l.linha}</td>
                  <td className="px-3 py-2 font-medium">{l.nome}</td>
                  <td className="tabular px-3 py-2">{formatarDataCivil(l.dataNascimento)}</td>
                  <td className="px-3 py-2">{l.classe}</td>
                  <td className="px-3 py-2">
                    {l.encarregado.nome}
                    {l.encarregado.parentesco && (
                      <span className="text-texto-2"> ({l.encarregado.parentesco})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Acompanhamento da tarefa: progresso, avisos por linha e o relatório para descarregar. */
function ResultadoImportacao({
  tarefaId,
  aoRecomecar,
}: {
  tarefaId: string
  aoRecomecar: () => void
}) {
  const { t } = useLingui()
  const { data: tarefa } = useQuery(tarefaQuery(tarefaId))
  const titulo = tarefa?.titulo ?? ''
  return (
    <section aria-labelledby="importacao-estado" className="flex max-w-2xl flex-col gap-4">
      <h2 id="importacao-estado" className="text-titulo-seccao">
        {tarefa?.terminada ? t`Importação concluída` : t`Importação em curso`}
      </h2>
      {!tarefa?.terminada ? (
        <>
          <BarraProgresso rotulo={t`Progresso da importação`} valor={tarefa?.progresso ?? 0} />
          <p className="text-secundario text-texto-2">
            <Trans>
              Corre em segundo plano: pode sair deste ecrã e acompanhar no quadro de tarefas.
            </Trans>
          </p>
        </>
      ) : tarefa.estado === 'FALHADA' ? (
        <Aviso tom="erro">{t`A importação falhou. Nenhum estudante foi criado.`}</Aviso>
      ) : (
        <>
          <Aviso tom="informacao">{titulo}</Aviso>
          {tarefa.erros.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-subtitulo">
                <Trans>Avisos por linha</Trans>
              </h3>
              <ul className="flex flex-col divide-y divide-linha rounded-cartao ring-1 ring-linha">
                {tarefa.erros.map((a, i) => {
                  const linha = a.linha
                  return (
                    <li key={i} className="px-3 py-2 text-secundario">
                      <span className="tabular font-medium">{t`Linha ${linha}`}</span> ·{' '}
                      {a.mensagem}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {tarefa.resultadoUrl && (
              <Button asChild>
                <a href={tarefa.resultadoUrl} download>
                  <Download aria-hidden className="size-4 stroke-[1.5]" />
                  <Trans>Descarregar relatório</Trans>
                </a>
              </Button>
            )}
            <Button asChild variante="primario">
              <Link to="/matriculas" search={{ page: 1, estado: 'PENDENTE' }}>
                <Trans>Ver matrículas pendentes</Trans>
              </Link>
            </Button>
            <Button onClick={aoRecomecar}>
              <Trans>Importar outro ficheiro</Trans>
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
