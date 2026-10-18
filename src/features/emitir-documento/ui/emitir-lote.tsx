import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Download, Files } from 'lucide-react'
import { useEffect, useState } from 'react'
import { simulacaoLoteQuery, type TipoLote } from '@/entities/documento-oficial'
import { tarefaQuery } from '@/entities/tarefa'
import { turmasQuery } from '@/entities/turma'
import { novaChaveIdempotencia } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  BarraProgresso,
  Button,
  Campo,
  Entrada,
  Esqueleto,
  Folha,
  Selector,
} from '@/shared/ui'
import { useEmitirLote } from '../model/use-documentos'

/**
 * Emitir em lote (guia 2.1, 5.1, 5.7): declarações para uma turma inteira. Mostra antes quem
 * recebe e quem fica de fora (com a razão), pede confirmação e gera um PDF único numa tarefa.
 */
export function EmitirEmLote({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const emitir = useEmitirLote()
  const [aberta, setAberta] = useState(false)
  const [tipo, setTipo] = useState<TipoLote>('DECLARACAO_FREQUENCIA')
  const [turmaId, setTurmaId] = useState<string | null>(null)
  const [finalidade, setFinalidade] = useState('')
  const [finalidadeVista, setFinalidadeVista] = useState('')
  const [revisto, setRevisto] = useState(false)
  const [chave, setChave] = useState(novaChaveIdempotencia)
  const [tarefaId, setTarefaId] = useState<string>()
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    const espera = setTimeout(() => setFinalidadeVista(finalidade.trim()), 400)
    return () => clearTimeout(espera)
  }, [finalidade])
  const { data: pagina } = useQuery({
    ...turmasQuery({ anoLectivoId, estado: 'ACTIVA', page: 1 }),
    enabled: aberta,
  })
  const pedido = turmaId ? { tipo, turmaId, finalidade: finalidadeVista || undefined } : null
  const { data: efeito, isFetching } = useQuery({
    ...simulacaoLoteQuery(pedido),
    enabled: aberta && pedido !== null && !tarefaId,
  })

  function fechar() {
    setAberta(false)
    setTurmaId(null)
    setFinalidade('')
    setFinalidadeVista('')
    setRevisto(false)
    setTarefaId(undefined)
    setErro(undefined)
    setChave(novaChaveIdempotencia())
  }

  function confirmar() {
    if (!turmaId) return
    setErro(undefined)
    emitir.mutate(
      { tipo, turmaId, finalidade: finalidade.trim() || undefined, chave },
      {
        onSuccess: (tarefa) => {
          setTarefaId(tarefa.id)
          anunciar.educado(t`Emissão em lote iniciada. Pode continuar a trabalhar.`)
        },
        onError: (e) => setErro(mensagemDeErro(e)),
      },
    )
  }

  const n = efeito?.incluidos.length ?? 0
  const pronto = Boolean(efeito && n > 0 && revisto && !isFetching)
  const botao =
    tipo === 'DECLARACAO_MATRICULA'
      ? plural(n, {
          one: 'Emitir # declaração de matrícula',
          other: 'Emitir # declarações de matrícula',
        })
      : plural(n, {
          one: 'Emitir # declaração de frequência',
          other: 'Emitir # declarações de frequência',
        })

  return (
    <>
      <Button onClick={() => setAberta(true)}>
        <Files aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Emitir em lote</Trans>
      </Button>
      <Folha
        larga
        aberta={aberta}
        aoMudar={(v) => !v && fechar()}
        pendente={emitir.isPending}
        titulo={t`Emitir em lote`}
        descricao={t`Declarações para uma turma inteira, num só PDF.`}
        rodape={
          tarefaId ? (
            <Button variante="primario" onClick={fechar}>
              <Trans>Concluir</Trans>
            </Button>
          ) : (
            <>
              <Button onClick={fechar} disabled={emitir.isPending}>
                <Trans>Cancelar</Trans>
              </Button>
              <Button
                variante="primario"
                disabled={!pronto}
                aCarregar={emitir.isPending}
                onClick={confirmar}
              >
                {botao}
              </Button>
            </>
          )
        }
      >
        {tarefaId ? (
          <EstadoLote tarefaId={tarefaId} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
            <div className="flex flex-col gap-5">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-legenda text-texto-2">
                  <Trans>Documento</Trans>
                </legend>
                {(
                  [
                    ['DECLARACAO_FREQUENCIA', t`Declaração de frequência`],
                    ['DECLARACAO_MATRICULA', t`Declaração de matrícula`],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label
                    key={valor}
                    className="flex cursor-pointer items-center gap-3 rounded-cartao bg-superficie px-3 py-2.5 ring-1 ring-linha has-checked:ring-2 has-checked:ring-acento"
                  >
                    <input
                      type="radio"
                      name="tipo-lote"
                      value={valor}
                      checked={tipo === valor}
                      onChange={() => {
                        setTipo(valor)
                        setRevisto(false)
                      }}
                      className="size-4 accent-(--color-acento)"
                    />
                    <span className="font-medium">{rotulo}</span>
                  </label>
                ))}
              </fieldset>
              <Campo rotulo={t`Turma`} obrigatorio>
                {(c) => (
                  <Selector
                    {...c}
                    opcoes={(pagina?.turmas ?? []).map((x) => {
                      const inscritos = x.inscritos
                      return {
                        valor: x.id,
                        rotulo: x.designacao,
                        descricao: t`${inscritos} inscritos`,
                      }
                    })}
                    valor={turmaId}
                    aoMudar={(v) => {
                      setTurmaId(v)
                      setRevisto(false)
                    }}
                  />
                )}
              </Campo>
              <Campo rotulo={t`Para efeitos de`} descricao={t`Opcional. Igual para todos.`}>
                {(c) => (
                  <Entrada
                    {...c}
                    value={finalidade}
                    onChange={(e) => setFinalidade(e.target.value)}
                  />
                )}
              </Campo>
              {erro && <Aviso tom="erro">{erro}</Aviso>}
              <label
                className={cn(
                  'flex items-start gap-3 rounded-cartao p-3 ring-1 ring-linha',
                  n > 0 ? 'cursor-pointer' : 'opacity-60',
                )}
              >
                <input
                  type="checkbox"
                  checked={revisto}
                  disabled={n === 0}
                  onChange={(e) => setRevisto(e.target.checked)}
                  className="mt-0.5 size-4 accent-(--color-acento)"
                />
                <span className="text-secundario">
                  <Trans>
                    Revi quem recebe. Sei que emitir não se desfaz: cada documento fica numerado e
                    só se anula, com motivo.
                  </Trans>
                </span>
              </label>
            </div>
            <Efeito
              semTurma={!turmaId}
              aCarregar={Boolean(turmaId) && (!efeito || isFetching)}
              incluidos={efeito?.incluidos}
              excluidos={efeito?.excluidos}
            />
          </div>
        )}
      </Folha>
    </>
  )
}

function Efeito({
  semTurma,
  aCarregar,
  incluidos,
  excluidos,
}: {
  semTurma: boolean
  aCarregar: boolean
  incluidos?: { estudanteId: string; nome: string; numeroProcesso: string }[]
  excluidos?: { estudanteId: string; nome: string; razao: string }[]
}) {
  const { t } = useLingui()
  if (semTurma) {
    return (
      <p className="rounded-cartao bg-fundo py-16 text-center text-secundario text-texto-2">
        <Trans>Escolha a turma para ver quem recebe.</Trans>
      </p>
    )
  }
  if (!incluidos || !excluidos) return <Esqueleto className="h-64 w-full" />
  const nIncluidos = incluidos.length
  const nExcluidos = excluidos.length
  return (
    <section
      aria-label={t`Efeito da emissão`}
      aria-busy={aCarregar || undefined}
      className={cn('flex min-w-0 flex-col gap-4 transition-opacity', aCarregar && 'opacity-60')}
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-subtitulo">{t`Recebem (${nIncluidos})`}</h3>
        {nIncluidos === 0 ? (
          <Aviso tom="aviso">
            <Trans>Ninguém desta turma pode receber este documento.</Trans>
          </Aviso>
        ) : (
          <ul
            aria-label={t`Recebem`}
            className="flex flex-col divide-y divide-linha rounded-cartao ring-1 ring-linha"
          >
            {incluidos.map((x) => (
              <li key={x.estudanteId} className="flex justify-between gap-3 px-3 py-1.5">
                <span>{x.nome}</span>
                <span className="tabular text-secundario text-texto-2">{x.numeroProcesso}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {nExcluidos > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-subtitulo">{t`Ficam de fora (${nExcluidos})`}</h3>
          <ul
            aria-label={t`Ficam de fora`}
            className="flex flex-col divide-y divide-linha rounded-cartao ring-1 ring-linha"
          >
            {excluidos.map((x) => (
              <li key={x.estudanteId} className="flex flex-col px-3 py-1.5">
                <span>{x.nome}</span>
                <span className="text-secundario text-texto-2">{x.razao}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Progresso da tarefa e, no fim, o PDF com todos os documentos e os avisos. */
function EstadoLote({ tarefaId }: { tarefaId: string }) {
  const { t } = useLingui()
  const { data: tarefa } = useQuery(tarefaQuery(tarefaId))
  const titulo = tarefa?.titulo ?? ''
  if (!tarefa?.terminada) {
    return (
      <div className="flex max-w-md flex-col gap-3">
        <BarraProgresso rotulo={t`A gerar o PDF`} valor={tarefa?.progresso ?? 0} />
        <p className="text-secundario text-texto-2">
          <Trans>
            Os documentos já estão numerados; o PDF é gerado em segundo plano. Pode fechar e
            descarregar no quadro de tarefas.
          </Trans>
        </p>
      </div>
    )
  }
  if (tarefa.estado === 'FALHADA') {
    return <Aviso tom="erro">{t`Não foi possível gerar o PDF. Tente de novo.`}</Aviso>
  }
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Aviso tom="informacao">{titulo}</Aviso>
      {tarefa.erros.length > 0 && (
        <ul
          aria-label={t`Sem documento`}
          className="flex flex-col divide-y divide-linha rounded-cartao ring-1 ring-linha"
        >
          {tarefa.erros.map((a, i) => (
            <li key={i} className="px-3 py-1.5 text-secundario">
              {a.mensagem}
            </li>
          ))}
        </ul>
      )}
      {tarefa.resultadoUrl && (
        <Button asChild variante="primario" className="w-fit">
          <a href={tarefa.resultadoUrl} download>
            <Download aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Descarregar PDF</Trans>
          </a>
        </Button>
      )}
    </div>
  )
}
