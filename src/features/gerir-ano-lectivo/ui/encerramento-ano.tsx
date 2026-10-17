import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CircleAlert, CircleCheck, Lock } from 'lucide-react'
import { useState } from 'react'
import { encerramentoQuery, type AnoLectivo, type Encerramento } from '@/entities/ano-lectivo'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  BarraProgresso,
  Button,
  Campo,
  Dialogo,
  Dica,
  Entrada,
  Esqueleto,
  notificar,
} from '@/shared/ui'
import { useEncerrarAno } from '../model/use-accoes-ano'

type Pendencia = Encerramento['pendencias'][number]

/**
 * Encerramento do ano (guia 2.3): pendências bloqueantes à vista, cada uma com o caminho para a
 * resolver; encerrar só quando não há nenhuma, com confirmação digitada. Depois, modo de leitura.
 */
export function EncerramentoAno({ ano, podeGerir }: { ano: AnoLectivo; podeGerir: boolean }) {
  const { t } = useLingui()
  const { data: enc } = useQuery(encerramentoQuery(ano.id))
  const [aConfirmar, setAConfirmar] = useState(false)
  if (!enc) return <Esqueleto className="h-64 w-full" />

  const designacao = ano.designacao
  const bloqueantes = enc.pendencias.filter((p) => p.bloqueante && p.quantidade > 0).length
  const razao = bloqueantes
    ? t`Resolva primeiro as pendências assinaladas (${bloqueantes}).`
    : undefined

  return (
    <section aria-labelledby="encerramento-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="encerramento-titulo" className="text-titulo-seccao">
          <Trans>Encerramento do ano</Trans>
        </h2>
        <p className="text-secundario text-texto-2">
          <Trans>
            Para encerrar, todas as matrículas têm de estar resolvidas e com o resultado final
            registado. Depois, o ano fica só para consulta.
          </Trans>
        </p>
      </div>
      <ul
        aria-label={t`Pendências do encerramento`}
        className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha"
      >
        {enc.pendencias.map((p) => (
          <LinhaPendencia key={p.tipo} pendencia={p} enc={enc} />
        ))}
      </ul>
      {podeGerir && (
        <div className="flex justify-end">
          {razao ? (
            <>
              <Dica texto={razao}>
                <Button
                  variante="destrutivo"
                  aria-disabled="true"
                  aria-describedby="razao-encerrar"
                  className="opacity-50"
                >
                  <Lock aria-hidden className="size-4 stroke-[1.5]" />
                  <Trans>Encerrar o ano {designacao}</Trans>
                </Button>
              </Dica>
              <span id="razao-encerrar" className="sr-only">
                {razao}
              </span>
            </>
          ) : (
            <Button variante="destrutivo" onClick={() => setAConfirmar(true)}>
              <Lock aria-hidden className="size-4 stroke-[1.5]" />
              <Trans>Encerrar o ano {designacao}</Trans>
            </Button>
          )}
        </div>
      )}
      <DialogoEncerrar ano={ano} aberto={aConfirmar} aoFechar={() => setAConfirmar(false)} />
    </section>
  )
}

function LinhaPendencia({ pendencia, enc }: { pendencia: Pendencia; enc: Encerramento }) {
  const { t } = useLingui()
  const n = pendencia.quantidade
  const resolvida = n === 0
  const TITULO = {
    MATRICULAS_PENDENTES: t`Matrículas por confirmar`,
    CONFIRMADAS_SEM_TURMA: t`Matrículas confirmadas sem turma`,
    RESULTADOS_EM_FALTA: t`Resultados finais por registar`,
  }
  const AJUDA = {
    MATRICULAS_PENDENTES: t`Confirme-as (com os documentos) ou anule-as.`,
    CONFIRMADAS_SEM_TURMA: t`Inscreva-as numa turma no quadro.`,
    RESULTADOS_EM_FALTA: t`Registe aprovado ou reprovado em cada turma.`,
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-start gap-3">
        {resolvida ? (
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-sucesso" />
        ) : (
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-perigo" />
        )}
        <div className="flex flex-1 flex-col">
          <span className="font-medium">{TITULO[pendencia.tipo]}</span>
          <span className={cn('text-secundario', resolvida ? 'text-texto-3' : 'text-texto-2')}>
            {resolvida
              ? t`Nenhuma. Está resolvido.`
              : `${t`Faltam ${n}.`} ${AJUDA[pendencia.tipo]}`}
          </span>
        </div>
        {!resolvida && pendencia.tipo === 'MATRICULAS_PENDENTES' && (
          <Link
            to="/matriculas"
            search={{ estado: 'PENDENTE', page: 1 }}
            className="text-secundario whitespace-nowrap text-acento hover:underline"
          >
            <Trans>Ver matrículas</Trans>
          </Link>
        )}
        {!resolvida && pendencia.tipo === 'CONFIRMADAS_SEM_TURMA' && (
          <Link
            to="/turmas/quadro"
            className="text-secundario whitespace-nowrap text-acento hover:underline"
          >
            <Trans>Abrir o quadro</Trans>
          </Link>
        )}
      </div>
      {!resolvida && pendencia.tipo === 'RESULTADOS_EM_FALTA' && (
        <ul
          aria-label={t`Turmas com resultados em falta`}
          className="ml-8 flex flex-wrap gap-x-4 gap-y-1 text-secundario"
        >
          {enc.turmasSemResultados.map((turma) => {
            const designacao = turma.designacao
            const falta = turma.emFalta
            const total = turma.total
            return (
              <li key={turma.turmaId}>
                <Link
                  to="/turmas/$turmaId/resultados"
                  params={{ turmaId: turma.turmaId }}
                  aria-label={t`Registar resultados da turma ${designacao}: faltam ${falta} de ${total}`}
                  className="tabular text-acento hover:underline"
                >
                  {t`${designacao} (faltam ${falta})`}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

/** Confirmação digitada (guia 2.3, 5.1): o efeito escrito por extenso e o nome do ano a escrever. */
function DialogoEncerrar({
  ano,
  aberto,
  aoFechar,
}: {
  ano: AnoLectivo
  aberto: boolean
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const encerrar = useEncerrarAno(ano.id)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string>()
  const designacao = ano.designacao
  const confere = texto.trim() === designacao

  function fechar() {
    setTexto('')
    setErro(undefined)
    aoFechar()
  }

  function confirmar() {
    setErro(undefined)
    encerrar.mutate(texto.trim(), {
      onSuccess: () => {
        const mensagem = t`O ano ${designacao} foi encerrado. Fica só para consulta.`
        notificar.sucesso(mensagem)
        anunciar.educado(mensagem)
        fechar()
      },
      onError: (e) => setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e)),
    })
  }

  return (
    <Dialogo
      aberta={aberto}
      aoMudar={(v) => !v && fechar()}
      pendente={encerrar.isPending}
      titulo={t`Encerrar o ano ${designacao}`}
      descricao={t`Esta acção muda muitos registos de uma vez.`}
      rodape={
        <>
          <Button onClick={fechar} disabled={encerrar.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante="destrutivo"
            disabled={!confere}
            aCarregar={encerrar.isPending}
            onClick={confirmar}
          >
            <Trans>Encerrar o ano</Trans>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ul className="flex list-disc flex-col gap-1 pl-5 text-secundario text-texto-2">
          <li>
            <Trans>As matrículas confirmadas ficam concluídas com o resultado registado.</Trans>
          </li>
          <li>
            <Trans>O resultado entra no percurso de cada estudante.</Trans>
          </li>
          <li>
            <Trans>As turmas ficam encerradas e o ano passa a só consulta.</Trans>
          </li>
          <li>
            <Trans>Só se reabre com justificação, e fica registado na auditoria.</Trans>
          </li>
        </ul>
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <Campo rotulo={t`Escreva ${designacao} para confirmar`}>
          {(c) => (
            <Entrada
              {...c}
              autoComplete="off"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={encerrar.isPending}
            />
          )}
        </Campo>
        {encerrar.isPending && (
          <BarraProgresso rotulo={t`A encerrar o ano ${designacao}`} estado="indeterminado" />
        )}
      </div>
    </Dialogo>
  )
}
