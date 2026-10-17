import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  ControloSegmentado,
  EstadoVazio,
  Folha,
  notificar,
  Selector,
} from '@/shared/ui'
import {
  useAplicarDistribuicao,
  useSimularDistribuicao,
  type Criterio,
  type Distribuicao,
} from '../model/use-distribuicao'

const NAO_INSCREVER = 'nao-inscrever'

/**
 * Distribuição automática (guia 2.3, 6.3): escolher o critério, simular, ajustar à mão turma a
 * turma, e confirmar com o número exacto de inscrições. Só matrículas confirmadas sem turma.
 */
export function DistribuirAutomaticamente({
  anoLectivoId,
  classeId,
  classe,
}: {
  anoLectivoId: string
  classeId: string
  classe: string
}) {
  const { t } = useLingui()
  const simular = useSimularDistribuicao()
  const aplicar = useAplicarDistribuicao()
  const [aberta, setAberta] = useState(false)
  const [criterio, setCriterio] = useState<Criterio>('EQUILIBRAR')
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const sim = simular.data

  const DESCRICAO: Record<Criterio, string> = {
    EQUILIBRAR: t`Cada estudante vai para a turma com mais vagas.`,
    ALFABETICA: t`Enche a primeira turma, depois a seguinte.`,
    SEXO: t`Equilibra rapazes e raparigas em cada turma.`,
  }

  function correr(c: Criterio) {
    setEscolhas({})
    simular.mutate(
      { anoLectivoId, classeId, criterio: c },
      { onError: (e) => notificar.erro(mensagemDeErro(e)) },
    )
  }

  const destinoDe = (p: Distribuicao['propostas'][number]) => escolhas[p.matriculaId] ?? p.turmaId
  const ocupacao = useMemo(() => {
    const mapa = new Map(sim?.turmas.map((x) => [x.turmaId, x.inscritos]) ?? [])
    for (const p of sim?.propostas ?? []) {
      const d = escolhas[p.matriculaId] ?? p.turmaId
      if (d !== NAO_INSCREVER) mapa.set(d, (mapa.get(d) ?? 0) + 1)
    }
    return mapa
  }, [sim, escolhas])
  const excedidas = sim?.turmas.filter((x) => (ocupacao.get(x.turmaId) ?? 0) > x.lotacao) ?? []
  const inscricoes = (sim?.propostas ?? [])
    .map((p) => ({ matriculaId: p.matriculaId, turmaId: destinoDe(p) }))
    .filter((i) => i.turmaId !== NAO_INSCREVER)
  const n = inscricoes.length
  const nPropostas = sim?.propostas.length ?? 0
  const nExcluidos = sim?.excluidos.length ?? 0

  function fechar() {
    setAberta(false)
    setEscolhas({})
    simular.reset()
  }

  function confirmar() {
    aplicar.mutate(
      { anoLectivoId, classeId, inscricoes },
      {
        onSuccess: () => {
          const mensagem = t`A inscrever ${n} estudantes. Acompanhe no quadro de tarefas.`
          anunciar.educado(mensagem)
          notificar.sucesso(mensagem)
          fechar()
        },
        onError: (e) => notificar.erro(mensagemDeErro(e)),
      },
    )
  }

  return (
    <>
      <Button
        onClick={() => {
          setAberta(true)
          correr(criterio)
        }}
      >
        <Wand2 aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Distribuir automaticamente</Trans>
      </Button>
      <Folha
        larga
        aberta={aberta}
        aoMudar={(v) => !v && fechar()}
        pendente={aplicar.isPending}
        titulo={t`Distribuir automaticamente`}
        descricao={t`${classe}: matrículas confirmadas sem turma. Simular não muda nada.`}
        rodape={
          <>
            <Button onClick={fechar} disabled={aplicar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button
              variante="primario"
              disabled={!sim || n === 0 || excedidas.length > 0}
              aCarregar={aplicar.isPending}
              onClick={confirmar}
            >
              {plural(n, { one: 'Inscrever # estudante', other: 'Inscrever # estudantes' })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-legenda text-texto-2">
              <Trans>Critério</Trans>
            </span>
            <ControloSegmentado
              rotulo={t`Critério de distribuição`}
              valor={criterio}
              aoMudar={(v) => {
                setCriterio(v as Criterio)
                correr(v as Criterio)
              }}
              opcoes={[
                { valor: 'EQUILIBRAR', rotulo: t`Equilibrar ocupação` },
                { valor: 'ALFABETICA', rotulo: t`Turma a turma` },
                { valor: 'SEXO', rotulo: t`Equilibrar sexo` },
              ]}
            />
            <p className="text-secundario text-texto-2">{DESCRICAO[criterio]}</p>
          </div>

          {sim && (
            <div className={cn('flex flex-col gap-6', simular.isPending && 'opacity-60')}>
              <table className="w-full text-left text-corpo">
                <caption className="sr-only">{t`Ocupação das turmas depois da distribuição`}</caption>
                <thead className="text-legenda text-texto-2">
                  <tr className="border-b border-linha">
                    <th scope="col" className="py-2 font-medium">
                      <Trans>Turma</Trans>
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      <Trans>Agora</Trans>
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      <Trans>Depois</Trans>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sim.turmas.map((x) => {
                    const depois = ocupacao.get(x.turmaId) ?? 0
                    const excede = depois > x.lotacao
                    return (
                      <tr key={x.turmaId} className="border-b border-linha">
                        <th scope="row" className="py-2 font-medium">
                          {x.designacao}
                        </th>
                        <td className="tabular py-2 text-right text-texto-2">
                          {x.inscritos} / {x.lotacao}
                        </td>
                        <td
                          className={cn(
                            'tabular py-2 text-right',
                            excede && 'font-medium text-perigo',
                          )}
                        >
                          {depois} / {x.lotacao}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {excedidas.length > 0 && (
                <Aviso tom="erro">
                  {t`Há turmas acima da lotação. Mude alguns estudantes de turma antes de confirmar.`}
                </Aviso>
              )}

              <section aria-labelledby="propostas-titulo" className="flex flex-col gap-2">
                <h3 id="propostas-titulo" className="text-subtitulo">
                  <Trans>Proposta ({nPropostas})</Trans>
                </h3>
                {sim.propostas.length === 0 ? (
                  <EstadoVazio titulo={t`Não há matrículas confirmadas sem turma nesta classe.`} />
                ) : (
                  <ul className="flex flex-col divide-y divide-linha rounded-cartao ring-1 ring-linha">
                    {sim.propostas.map((p) => {
                      const nome = p.nome
                      return (
                        <li key={p.matriculaId} className="flex items-center gap-3 px-3 py-2">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate font-medium">{nome}</span>
                            <span className="tabular text-secundario text-texto-3">
                              {p.numeroProcesso} · {p.sexo === 'F' ? t`F` : t`M`}
                            </span>
                          </span>
                          <div className="w-48">
                            <Selector
                              aria-label={t`Turma de ${nome}`}
                              opcoes={[
                                ...sim.turmas.map((x) => ({
                                  valor: x.turmaId,
                                  rotulo: x.designacao,
                                })),
                                { valor: NAO_INSCREVER, rotulo: t`Não inscrever agora` },
                              ]}
                              valor={destinoDe(p)}
                              aoMudar={(v) =>
                                v && setEscolhas((e) => ({ ...e, [p.matriculaId]: v }))
                              }
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              {sim.excluidos.length > 0 && (
                <section aria-labelledby="excluidos-dist-titulo" className="flex flex-col gap-2">
                  <h3 id="excluidos-dist-titulo" className="text-subtitulo">
                    <Trans>Ficam de fora ({nExcluidos})</Trans>
                  </h3>
                  <ul className="flex flex-col gap-1 text-secundario">
                    {sim.excluidos.map((x) => (
                      <li key={x.matriculaId}>
                        <span className="font-medium text-texto-1">{x.nome}</span> ·{' '}
                        <span className="text-texto-2">
                          {x.motivo === 'MATRICULA_POR_CONFIRMAR'
                            ? t`matrícula por confirmar`
                            : t`não há vagas nas turmas da classe`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </Folha>
    </>
  )
}
