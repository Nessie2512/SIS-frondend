import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { disciplinasQuery } from '@/entities/disciplina'
import type { Plano } from '@/entities/plano'
import { Button, Campo, EdicaoNoSitio, Entrada, Selector } from '@/shared/ui'
import { useEditarPlano } from '../model/use-editar-plano'

interface Props {
  plano: Plano
  /** Permissão e plano em rascunho */
  podeEditar: boolean
}

const validarHoras = (valor: string) => {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1 && n <= 10 ? undefined : 'invalido'
}

/**
 * Disciplinas do plano com carga semanal (guia 2.5: árvore e edição no sítio).
 * Só o rascunho se edita; vigente e arquivado ficam em leitura.
 */
export function EditorPlano({ plano, podeEditar }: Props) {
  const { t } = useLingui()
  const { alterarHoras, retirar } = useEditarPlano(plano.id)
  const total = plano.totalHoras
  const mensagemHoras = t`Indique entre 1 e 10 horas por semana.`

  return (
    <section aria-labelledby="disciplinas-plano" className="flex flex-col gap-2">
      <h2 id="disciplinas-plano" className="sr-only">
        <Trans>Disciplinas do plano</Trans>
      </h2>
      {plano.linhas.length === 0 ? (
        <p className="py-6 text-texto-2">
          <Trans>Este plano ainda não tem disciplinas.</Trans>
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-linha">
          {plano.linhas.map((linha) => {
            const nome = linha.disciplina
            const horas = linha.horasSemanais
            return (
              <li key={linha.disciplinaId} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {podeEditar ? (
                    <EdicaoNoSitio
                      rotulo={nome}
                      valor={String(horas)}
                      inputMode="numeric"
                      mostrar={(v) => (v ? t`${v} h por semana` : null)}
                      validar={(v) => (validarHoras(v) ? mensagemHoras : undefined)}
                      aoGuardar={(v) => alterarHoras(linha.disciplinaId, Number(v))}
                    />
                  ) : (
                    <div className="grid grid-cols-[13rem_1fr] items-center gap-x-6 py-2">
                      <span className="flex min-h-9 items-center text-texto-2">{nome}</span>
                      <span className="tabular">{t`${horas} h por semana`}</span>
                    </div>
                  )}
                </div>
                {podeEditar && (
                  <Button
                    variante="discreto"
                    tamanho="compacto"
                    aria-label={t`Retirar ${nome} do plano`}
                    onClick={() => retirar(linha)}
                  >
                    <Minus aria-hidden className="size-4 stroke-[1.5]" />
                    <Trans>Retirar</Trans>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="tabular flex justify-between border-t border-linha pt-3 font-medium">
        <span>
          <Trans>Total semanal</Trans>
        </span>
        <span>{t`${total} h`}</span>
      </p>
      {podeEditar && <AcrescentarDisciplina plano={plano} />}
    </section>
  )
}

function AcrescentarDisciplina({ plano }: { plano: Plano }) {
  const { t } = useLingui()
  const { acrescentar } = useEditarPlano(plano.id)
  const { data: disciplinas = [] } = useQuery(disciplinasQuery())
  const [disciplinaId, setDisciplinaId] = useState<string | null>(null)
  const [horas, setHoras] = useState('2')
  const [erro, setErro] = useState<{ campo: 'disciplina' | 'horas'; mensagem: string }>()

  const disponiveis = disciplinas.filter(
    (d) => d.activa && !plano.linhas.some((l) => l.disciplinaId === d.id),
  )

  function submeter() {
    const disciplina = disponiveis.find((d) => d.id === disciplinaId)
    if (!disciplina) return setErro({ campo: 'disciplina', mensagem: t`Escolha uma disciplina.` })
    if (validarHoras(horas)) {
      return setErro({ campo: 'horas', mensagem: t`Indique entre 1 e 10 horas por semana.` })
    }
    acrescentar({
      disciplinaId: disciplina.id,
      disciplina: disciplina.nome,
      sigla: disciplina.sigla,
      horasSemanais: Number(horas),
    })
    setDisciplinaId(null)
    setHoras('2')
    setErro(undefined)
  }

  if (!disponiveis.length) return null

  return (
    <form
      noValidate
      aria-label={t`Acrescentar disciplina ao plano`}
      onSubmit={(e) => {
        e.preventDefault()
        submeter()
      }}
      className="mt-4 flex flex-wrap items-start gap-3 rounded-cartao bg-fundo p-4"
    >
      <Campo
        rotulo={t`Disciplina`}
        erro={erro?.campo === 'disciplina' ? erro.mensagem : undefined}
        className="w-64"
      >
        {(c) => (
          <Selector
            {...c}
            placeholder={t`Escolher`}
            opcoes={disponiveis.map((d) => ({ valor: d.id, rotulo: d.nome }))}
            valor={disciplinaId}
            aoMudar={(v) => {
              setDisciplinaId(v)
              setErro(undefined)
            }}
          />
        )}
      </Campo>
      <Campo
        rotulo={t`Horas por semana`}
        erro={erro?.campo === 'horas' ? erro.mensagem : undefined}
        className="w-36"
      >
        {(c) => (
          <Entrada
            {...c}
            inputMode="numeric"
            value={horas}
            onChange={(e) => {
              setHoras(e.target.value)
              setErro(undefined)
            }}
          />
        )}
      </Campo>
      <Button type="submit" className="mt-[22px]">
        <Plus aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Acrescentar</Trans>
      </Button>
    </form>
  )
}
