import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { ListChecks, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AnoLectivo } from '@/entities/ano-lectivo'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  colunasDe,
  Dialogo,
  EstadoVazio,
  EtiquetaEstado,
  notificar,
  TabelaDados,
  type ColunaTabela,
} from '@/shared/ui'
import { useAplicarRenovacao, useSimularRenovacao, type Simulacao } from '../model/use-renovacao'

type Incluido = Simulacao['incluidos'][number]
type Excluido = Simulacao['excluidos'][number]

/**
 * Renovação de matrículas em lote (guia 2.3, 6.3): simular, rever o resumo por classe e os
 * excluídos com motivo, retirar à mão quem não deve renovar, confirmar com o número exacto e
 * acompanhar a tarefa.
 */
export function RenovacaoMatriculas({ destino }: { destino: AnoLectivo }) {
  const { t } = useLingui()
  const simular = useSimularRenovacao()
  const aplicar = useAplicarRenovacao()
  const [retirados, setRetirados] = useState<ReadonlySet<string>>(new Set())
  const [aConfirmar, setAConfirmar] = useState(false)
  const [aplicada, setAplicada] = useState(false)
  const sim = simular.data
  const designacao = destino.designacao

  function correrSimulacao() {
    setRetirados(new Set())
    simular.mutate(destino.id, {
      onSuccess: (s) => {
        const n = s.incluidos.length
        const fora = s.excluidos.length
        anunciar.educado(t`Simulação pronta: ${n} renovam, ${fora} ficam de fora.`)
      },
      onError: (e) => notificar.erro(mensagemDeErro(e)),
    })
  }

  function alternar(id: string) {
    setRetirados((r) => {
      const novo = new Set(r)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  if (aplicada) {
    return (
      <Aviso tom="informacao">
        <Trans>
          A renovação está a correr em segundo plano. Acompanhe-a no quadro de tarefas; quando
          terminar, distribua os estudantes pelas turmas.
        </Trans>{' '}
        <Link
          to="/anos-lectivos/$anoId"
          params={{ anoId: destino.id }}
          className="text-acento hover:underline"
        >
          <Trans>Voltar às etapas da abertura</Trans>
        </Link>
      </Aviso>
    )
  }

  const nRetirados = retirados.size
  const aRenovar = sim ? sim.incluidos.filter((i) => !retirados.has(i.matriculaId)).length : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variante={sim ? 'secundario' : 'primario'}
          aCarregar={simular.isPending}
          onClick={correrSimulacao}
        >
          {sim ? (
            <RotateCcw aria-hidden className="size-4 stroke-[1.5]" />
          ) : (
            <ListChecks aria-hidden className="size-4 stroke-[1.5]" />
          )}
          {sim ? <Trans>Simular de novo</Trans> : <Trans>Simular a renovação</Trans>}
        </Button>
        {!sim && (
          <p className="text-secundario text-texto-2">
            <Trans>Simular não muda nada. Pode simular as vezes que quiser.</Trans>
          </p>
        )}
      </div>

      {sim && (
        <>
          <ResumoPorClasse sim={sim} />
          <SemResultado sim={sim} />
          <TabelaIncluidos sim={sim} retirados={retirados} aoAlternar={alternar} />
          <TabelaExcluidos sim={sim} />
          <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t border-linha bg-fundo/90 px-6 py-3 backdrop-blur-md">
            <p className="tabular text-secundario text-texto-2" aria-live="polite">
              {nRetirados > 0 && t`${nRetirados} retirados à mão.`}
            </p>
            <Button
              variante="primario"
              disabled={aRenovar === 0}
              onClick={() => setAConfirmar(true)}
            >
              <Trans>Confirmar a renovação de {aRenovar} matrículas</Trans>
            </Button>
          </div>
          <Dialogo
            aberta={aConfirmar}
            aoMudar={setAConfirmar}
            pendente={aplicar.isPending}
            titulo={t`Renovar ${aRenovar} matrículas para ${designacao}`}
            descricao={t`Cria ${aRenovar} matrículas confirmadas, sem turma, em ${designacao}. A renovação só se faz uma vez para cada ano; as que faltarem fazem-se depois uma a uma.`}
            rodape={
              <>
                <Button onClick={() => setAConfirmar(false)} disabled={aplicar.isPending}>
                  <Trans>Cancelar</Trans>
                </Button>
                <Button
                  variante="primario"
                  aCarregar={aplicar.isPending}
                  onClick={() =>
                    aplicar.mutate(
                      { id: sim.id, excluir: [...retirados] },
                      {
                        onSuccess: () => {
                          setAConfirmar(false)
                          setAplicada(true)
                          anunciar.educado(t`A renovação começou. Acompanhe no quadro de tarefas.`)
                        },
                        onError: (e) => {
                          setAConfirmar(false)
                          notificar.erro(mensagemDeErro(e))
                        },
                      },
                    )
                  }
                >
                  <Trans>Renovar {aRenovar}</Trans>
                </Button>
              </>
            }
          />
        </>
      )}
    </div>
  )
}

function ResumoPorClasse({ sim }: { sim: Simulacao }) {
  const { t } = useLingui()
  const origem = sim.anoOrigem
  const destino = sim.anoDestino
  return (
    <section aria-labelledby="resumo-renovacao" className="flex flex-col gap-3">
      <h2 id="resumo-renovacao" className="text-titulo-seccao">
        <Trans>Resumo por classe</Trans>
      </h2>
      <p className="text-secundario text-texto-2">{t`De ${origem} para ${destino}.`}</p>
      {sim.resumo.length === 0 ? (
        <EstadoVazio
          titulo={t`Ninguém renova com os dados actuais.`}
          descricao={t`Veja abaixo porque ficam de fora.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
          <table className="w-full text-left text-corpo">
            <caption className="sr-only">{t`Renovação por classe de destino`}</caption>
            <thead className="text-legenda text-texto-2">
              <tr className="border-b border-linha">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <Trans>Classe em {destino}</Trans>
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <Trans>Sobem</Trans>
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <Trans>Repetem</Trans>
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <Trans>Total</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {sim.resumo.map((r) => (
                <tr key={r.classeId} className="h-linha border-b border-linha last:border-0">
                  <th scope="row" className="px-4 font-medium">
                    {r.classe}
                  </th>
                  <td className="tabular px-4 text-right">{r.sobem}</td>
                  <td className="tabular px-4 text-right">{r.repetem}</td>
                  <td className="tabular px-4 text-right font-medium">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Quando faltam resultados finais, o caminho para os registar fica logo à vista. */
function SemResultado({ sim }: { sim: Simulacao }) {
  const n = sim.excluidos.filter((e) => e.motivo === 'SEM_RESULTADO').length
  const origem = sim.anoOrigem
  if (n === 0) return null
  return (
    <Aviso tom="aviso">
      <Trans>
        {n} estudantes ficam de fora por não terem resultado final registado em {origem}.
      </Trans>{' '}
      <Link
        to="/anos-lectivos/$anoId"
        params={{ anoId: sim.anoOrigemId }}
        className="text-acento hover:underline"
      >
        <Trans>Ver os resultados em falta por turma</Trans>
      </Link>
    </Aviso>
  )
}

function TabelaIncluidos({
  sim,
  retirados,
  aoAlternar,
}: {
  sim: Simulacao
  retirados: ReadonlySet<string>
  aoAlternar: (id: string) => void
}) {
  const { t } = useLingui()
  const colunas = useMemo((): ColunaTabela<Incluido>[] => {
    const c = colunasDe<Incluido>()
    return [
      c.accessor('nome', {
        header: t`Estudante`,
        cell: (info) => (
          <span
            className={cn(
              'font-medium',
              retirados.has(info.row.original.matriculaId) && 'text-texto-3 line-through',
            )}
          >
            {info.getValue()}{' '}
            <span className="tabular font-normal text-texto-3">
              {info.row.original.numeroProcesso}
            </span>
          </span>
        ),
      }),
      c.accessor('classeActual', { header: t`Agora` }),
      c.accessor('classeDestino', { header: t`Renova na` }),
      c.accessor('resultado', {
        header: t`Resultado`,
        cell: (info) =>
          info.getValue() === 'APROVADO' ? (
            <EtiquetaEstado tom="sucesso">{t`Sobe`}</EtiquetaEstado>
          ) : (
            <EtiquetaEstado tom="aviso">{t`Repete`}</EtiquetaEstado>
          ),
      }),
      c.display({
        id: 'accao',
        header: () => (
          <span className="sr-only">
            <Trans>Acção</Trans>
          </span>
        ),
        cell: (info) => {
          const nome = info.row.original.nome
          const fora = retirados.has(info.row.original.matriculaId)
          return (
            <span className="flex justify-end">
              <Button
                tamanho="compacto"
                variante="discreto"
                aria-label={fora ? t`Repor ${nome}` : t`Retirar ${nome}`}
                onClick={() => aoAlternar(info.row.original.matriculaId)}
              >
                {fora ? <Trans>Repor</Trans> : <Trans>Retirar</Trans>}
              </Button>
            </span>
          )
        },
      }),
    ]
  }, [t, retirados, aoAlternar])

  const n = sim.incluidos.length
  return (
    <section aria-labelledby="incluidos-renovacao" className="flex flex-col gap-3">
      <h2 id="incluidos-renovacao" className="text-titulo-seccao">
        <Trans>Renovam ({n})</Trans>
      </h2>
      <TabelaDados
        rotulo={t`Matrículas a renovar`}
        semOrdenacao
        colunas={colunas}
        dados={sim.incluidos}
        idDaLinha={(i) => i.matriculaId}
        alturaMaxima={480}
        vazio={<EstadoVazio titulo={t`Ninguém renova com os dados actuais.`} />}
      />
    </section>
  )
}

function TabelaExcluidos({ sim }: { sim: Simulacao }) {
  const { t } = useLingui()
  const MOTIVO: Record<Excluido['motivo'], string> = {
    SEM_RESULTADO: t`Sem resultado final registado`,
    FIM_DE_CICLO: t`Concluiu a última classe da escola`,
    JA_MATRICULADO: t`Já tem matrícula no ano seguinte`,
    ESTUDANTE_INACTIVO: t`Transferido, desistente ou com processo anulado`,
  }
  const colunas = useMemo((): ColunaTabela<Excluido>[] => {
    const c = colunasDe<Excluido>()
    return [
      c.accessor('nome', {
        header: t`Estudante`,
        cell: (info) => (
          <span className="font-medium">
            {info.getValue()}{' '}
            <span className="tabular font-normal text-texto-3">
              {info.row.original.numeroProcesso}
            </span>
          </span>
        ),
      }),
      c.accessor('classeActual', { header: t`Classe` }),
      c.accessor('motivo', {
        header: t`Motivo`,
        cell: (info) => (
          <span className="text-texto-2">{MOTIVO[info.getValue() as Excluido['motivo']]}</span>
        ),
      }),
    ]
    // MOTIVO depende só de t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])
  const n = sim.excluidos.length
  return (
    <section aria-labelledby="excluidos-renovacao" className="flex flex-col gap-3">
      <h2 id="excluidos-renovacao" className="text-titulo-seccao">
        <Trans>Ficam de fora ({n})</Trans>
      </h2>
      <TabelaDados
        rotulo={t`Matrículas que não renovam`}
        semOrdenacao
        colunas={colunas}
        dados={sim.excluidos}
        idDaLinha={(e) => e.matriculaId}
        alturaMaxima={360}
        vazio={<EstadoVazio titulo={t`Ninguém fica de fora.`} />}
      />
    </section>
  )
}
