import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Download, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { BarraProgresso, Button, notificar } from '@/shared/ui'
import { tarefaQuery } from '../api/queries'
import { useTarefasAcompanhadas } from '../model/acompanhadas'
import type { Tarefa } from '../model/tipos'

/**
 * Quadro persistente de tarefas longas (guia 5.7, 6.2): canto inferior esquerdo, fica entre
 * ecrãs, mostra o progresso, o resultado e o relatório de erros por linha. O utilizador pode
 * continuar a trabalhar; o fim é anunciado e notificado.
 */
export function QuadroTarefas() {
  const { t } = useLingui()
  const ids = useTarefasAcompanhadas((e) => e.ids)
  const [recolhido, setRecolhido] = useState(false)
  if (ids.length === 0) return null

  const total = ids.length
  return (
    <section
      // Fica utilizável mesmo com um painel modal aberto, como as notificações
      aria-label={t`Tarefas em segundo plano`}
      style={{ pointerEvents: 'auto' }}
      className="fixed bottom-4 left-4 z-30 w-80 overflow-hidden rounded-cartao bg-superficie shadow-flutuante ring-1 ring-linha print:hidden"
    >
      <header className="flex h-10 items-center justify-between border-b border-linha pr-1 pl-4">
        <h2 className="text-secundario font-medium">
          <Trans>Tarefas ({total})</Trans>
        </h2>
        <Button
          variante="discreto"
          tamanho="icone"
          className="size-8 text-texto-2"
          aria-expanded={!recolhido}
          aria-label={recolhido ? t`Mostrar tarefas` : t`Recolher tarefas`}
          onClick={() => setRecolhido((r) => !r)}
        >
          <ChevronDown
            aria-hidden
            className={cn(
              'size-4 stroke-[1.5] transition-transform duration-(--duracao-micro)',
              recolhido && 'rotate-180',
            )}
          />
        </Button>
      </header>
      {!recolhido && (
        <ul className="max-h-80 divide-y divide-linha overflow-y-auto">
          {ids.map((id) => (
            <LinhaTarefa key={id} id={id} />
          ))}
        </ul>
      )}
    </section>
  )
}

function LinhaTarefa({ id }: { id: string }) {
  const { t } = useLingui()
  const dispensar = useTarefasAcompanhadas((e) => e.dispensar)
  const { data: tarefa, isError } = useQuery(tarefaQuery(id))
  useAvisoAoTerminar(tarefa)

  if (isError) {
    return (
      <li className="flex items-center gap-3 px-4 py-3 text-secundario text-texto-2">
        <span className="flex-1">
          <Trans>Esta tarefa já não está disponível.</Trans>
        </span>
        <BotaoDispensar aoDispensar={() => dispensar(id)} />
      </li>
    )
  }
  if (!tarefa) {
    return (
      <li className="px-4 py-3">
        <BarraProgresso rotulo={t`A obter o estado da tarefa`} estado="indeterminado" />
      </li>
    )
  }

  const progresso = tarefa.progresso
  const titulo = tarefa.titulo
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-corpo">{titulo}</p>
        {tarefa.terminada && <BotaoDispensar aoDispensar={() => dispensar(id)} />}
      </div>
      <BarraProgresso
        rotulo={titulo}
        valor={progresso}
        estado={
          tarefa.estado === 'CONCLUIDA'
            ? 'concluido'
            : tarefa.estado === 'FALHADA'
              ? 'falhado'
              : 'determinado'
        }
      />
      {tarefa.estado === 'EM_CURSO' && (
        <p className="tabular text-legenda text-texto-3">
          {t`${progresso}% · pode continuar a trabalhar`}
        </p>
      )}
      {tarefa.estado === 'CONCLUIDA' && tarefa.resultadoUrl && (
        <Button asChild tamanho="compacto" className="w-fit">
          <a href={tarefa.resultadoUrl} download>
            <Download aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Descarregar</Trans>
          </a>
        </Button>
      )}
      {tarefa.estado === 'FALHADA' && (
        <div className="flex flex-col gap-1 text-secundario">
          <p className="text-perigo">
            <Trans>Não foi possível concluir. Corrija estas linhas e tente de novo:</Trans>
          </p>
          <ul className="flex flex-col gap-0.5 text-texto-2">
            {tarefa.erros.map((e) => {
              const linha = e.linha
              const mensagem = e.mensagem
              return <li key={`${linha}-${mensagem}`}>{t`Linha ${linha}: ${mensagem}`}</li>
            })}
          </ul>
        </div>
      )}
    </li>
  )
}

function BotaoDispensar({ aoDispensar }: { aoDispensar: () => void }) {
  const { t } = useLingui()
  return (
    <Button
      variante="discreto"
      tamanho="icone"
      className="-mt-1 -mr-2 size-7 shrink-0 text-texto-2"
      aria-label={t`Dispensar`}
      onClick={aoDispensar}
    >
      <X aria-hidden className="size-4 stroke-[1.5]" />
    </Button>
  )
}

/** Avisa uma vez quando a tarefa passa de em curso para terminada (não ao recarregar). */
function useAvisoAoTerminar(tarefa: Tarefa | undefined) {
  const { t } = useLingui()
  const anterior = useRef(tarefa?.estado)
  useEffect(() => {
    const antes = anterior.current
    anterior.current = tarefa?.estado
    if (!tarefa || antes !== 'EM_CURSO' || !tarefa.terminada) return
    const titulo = tarefa.titulo
    if (tarefa.estado === 'CONCLUIDA') {
      notificar.sucesso(t`${titulo} está pronta.`)
      anunciar.educado(t`${titulo} está pronta para descarregar.`)
    } else {
      notificar.erro(t`${titulo} falhou. Veja o relatório no quadro de tarefas.`)
      anunciar.assertivo(t`${titulo} falhou.`)
    }
  }, [tarefa, t])
}
