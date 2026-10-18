import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { ciclosQuery, type Ciclo } from '@/entities/classe'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Button,
  Campo,
  Dica,
  EdicaoNoSitio,
  Entrada,
  Esqueleto,
  EtiquetaEstado,
  Folha,
  notificar,
  notificarComDesfazer,
} from '@/shared/ui'
import {
  useCriarCiclo,
  useCriarClasse,
  useEliminarClasse,
  useEstadoClasse,
  useRenomearClasse,
} from '../model/use-classes'

type ClasseGestao = Ciclo['classes'][number]

/**
 * Ciclos e classes (guia 2.1, 2.4, 2.5): árvore com a sequência das classes. Uma classe em
 * uso não se elimina: a acção chama-se Inactivar e diz o que mantém.
 */
export function ArvoreClasses({ podeEditar }: { podeEditar: boolean }) {
  const { t } = useLingui()
  const { data: ciclos } = useQuery(ciclosQuery())
  const [novo, setNovo] = useState<{ tipo: 'ciclo' } | { tipo: 'classe'; ciclo: Ciclo }>()
  if (!ciclos) return <Esqueleto className="h-96 w-full" />
  const todas = ciclos.flatMap((c) => c.classes).sort((a, b) => a.ordem - b.ordem)
  const seguinte = (c: ClasseGestao) => todas.find((x) => x.ordem === c.ordem + 1)

  return (
    <section aria-labelledby="classes-titulo" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="classes-titulo" className="text-titulo-pagina">
            <Trans>Ciclos e classes</Trans>
          </h1>
          <p className="text-secundario text-texto-2">
            <Trans>
              A ordem das classes define a classe seguinte na renovação. Uma classe em uso não se
              elimina: inactiva-se.
            </Trans>
          </p>
        </div>
        {podeEditar && (
          <Button onClick={() => setNovo({ tipo: 'ciclo' })}>
            <Plus aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Novo ciclo</Trans>
          </Button>
        )}
      </div>
      {ciclos.map((ciclo) => {
        const nomeCiclo = ciclo.designacao
        return (
          <section
            key={ciclo.id}
            aria-labelledby={`ciclo-${ciclo.id}`}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={`ciclo-${ciclo.id}`} className="text-titulo-seccao">
                {ciclo.designacao}
              </h2>
              {podeEditar && (
                <Button
                  tamanho="compacto"
                  variante="discreto"
                  aria-label={t`Nova classe em ${nomeCiclo}`}
                  onClick={() => setNovo({ tipo: 'classe', ciclo })}
                >
                  <Plus aria-hidden className="size-4 stroke-[1.5]" />
                  <Trans>Nova classe</Trans>
                </Button>
              )}
            </div>
            {ciclo.classes.length === 0 ? (
              <p className="text-secundario text-texto-2">
                <Trans>Ainda sem classes neste ciclo.</Trans>
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha">
                {ciclo.classes.map((classe) => (
                  <LinhaClasse
                    key={classe.id}
                    classe={classe}
                    seguinte={seguinte(classe)?.designacao ?? null}
                    podeEditar={podeEditar}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
      {novo && <FolhaNovo novo={novo} aoFechar={() => setNovo(undefined)} />}
    </section>
  )
}

function LinhaClasse({
  classe,
  seguinte,
  podeEditar,
}: {
  classe: ClasseGestao
  seguinte: string | null
  podeEditar: boolean
}) {
  const { t } = useLingui()
  const renomear = useRenomearClasse()
  const eliminar = useEliminarClasse()
  const estado = useEstadoClasse()
  const designacao = classe.designacao
  const activa = classe.estado === 'ACTIVA'
  const emUso = classe.turmas + classe.matriculas + classe.planos > 0
  const turmas = classe.turmas
  const matriculas = classe.matriculas
  const planos = classe.planos

  function inactivarOuReactivar() {
    const novo = activa ? 'INACTIVA' : 'ACTIVA'
    estado.mutate(
      { id: classe.id, estado: novo },
      { onError: (e) => notificar.erro(mensagemDeErro(e)) },
    )
    const mensagem = activa
      ? t`${designacao} inactivada: deixa de ser oferecida em matrículas e turmas novas.`
      : t`${designacao} reactivada.`
    anunciar.educado(mensagem)
    notificarComDesfazer(mensagem, () =>
      estado.mutate({ id: classe.id, estado: activa ? 'ACTIVA' : 'INACTIVA' }),
    )
  }

  return (
    <li
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3', !activa && 'bg-fundo')}
    >
      <div className="flex min-w-48 flex-1 flex-col gap-0.5">
        {podeEditar ? (
          <EdicaoNoSitio
            rotulo={t`Designação`}
            valor={designacao}
            validar={(v) => (v.trim().length < 3 ? t`Escreva a designação da classe.` : undefined)}
            aoGuardar={async (novo) => {
              try {
                await renomear.mutateAsync({ id: classe.id, designacao: novo })
              } catch (e) {
                throw new Error((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e), {
                  cause: e,
                })
              }
            }}
          />
        ) : (
          <span className="font-medium">{designacao}</span>
        )}
        <span className="text-secundario text-texto-2">
          {seguinte ? t`A seguir: ${seguinte}` : t`Última classe da escola`}
          {' · '}
          {emUso
            ? [
                plural(turmas, { one: '# turma', other: '# turmas' }),
                plural(matriculas, { one: '# matrícula', other: '# matrículas' }),
                plural(planos, { one: '# plano', other: '# planos' }),
              ].join(', ')
            : t`Ainda sem uso`}
        </span>
      </div>
      {!activa && <EtiquetaEstado tom="neutra">{t`Inactiva`}</EtiquetaEstado>}
      <span id={`efeito-${classe.id}`} className="sr-only">
        {activa
          ? t`Está em uso: mantém turmas, matrículas e planos; só deixa de ser oferecida.`
          : t`Volta a ser oferecida em matrículas e turmas novas.`}
      </span>
      {podeEditar &&
        (emUso || !activa ? (
          <Dica
            texto={
              activa
                ? t`Está em uso: mantém turmas, matrículas e planos; só deixa de ser oferecida.`
                : t`Volta a ser oferecida em matrículas e turmas novas.`
            }
          >
            <Button
              tamanho="compacto"
              aria-label={activa ? t`Inactivar ${designacao}` : t`Reactivar ${designacao}`}
              aria-describedby={`efeito-${classe.id}`}
              onClick={inactivarOuReactivar}
            >
              {activa ? <Trans>Inactivar</Trans> : <Trans>Reactivar</Trans>}
            </Button>
          </Dica>
        ) : (
          <Button
            tamanho="compacto"
            variante="discreto"
            className="text-perigo"
            aria-label={t`Eliminar ${designacao}`}
            aCarregar={eliminar.isPending}
            onClick={() =>
              eliminar.mutate(classe.id, {
                onSuccess: () => notificar.sucesso(t`${designacao} eliminada.`),
                onError: (e) => notificar.erro(mensagemDeErro(e)),
              })
            }
          >
            <Trans>Eliminar</Trans>
          </Button>
        ))}
    </li>
  )
}

function FolhaNovo({
  novo,
  aoFechar,
}: {
  novo: { tipo: 'ciclo' } | { tipo: 'classe'; ciclo: Ciclo }
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const criarCiclo = useCriarCiclo()
  const criarClasse = useCriarClasse()
  const [designacao, setDesignacao] = useState('')
  const [erro, setErro] = useState<string>()
  const pendente = criarCiclo.isPending || criarClasse.isPending
  const ehClasse = novo.tipo === 'classe'
  const cicloNome = ehClasse ? novo.ciclo.designacao : ''

  function gravar() {
    if (designacao.trim().length < 3) {
      return setErro(ehClasse ? t`Escreva a designação da classe.` : t`Escreva o nome do ciclo.`)
    }
    const aoFalhar = (e: unknown) =>
      setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e))
    const nome = designacao.trim()
    if (ehClasse) {
      criarClasse.mutate(
        { cicloId: novo.ciclo.id, designacao: nome },
        {
          onSuccess: () => {
            notificar.sucesso(t`${nome} criada.`)
            aoFechar()
          },
          onError: aoFalhar,
        },
      )
    } else {
      criarCiclo.mutate(nome, {
        onSuccess: () => {
          notificar.sucesso(t`${nome} criado.`)
          aoFechar()
        },
        onError: aoFalhar,
      })
    }
  }

  return (
    <Folha
      aberta
      aoMudar={(v) => !v && aoFechar()}
      pendente={pendente}
      titulo={ehClasse ? t`Nova classe` : t`Novo ciclo`}
      descricao={
        ehClasse
          ? t`Entra a seguir à última classe de ${cicloNome}.`
          : t`Depois acrescente-lhe as classes, pela ordem.`
      }
      rodape={
        <>
          <Button onClick={aoFechar} disabled={pendente}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button variante="primario" aCarregar={pendente} onClick={gravar}>
            {ehClasse ? <Trans>Criar classe</Trans> : <Trans>Criar ciclo</Trans>}
          </Button>
        </>
      }
    >
      <Campo rotulo={t`Designação`} erro={erro} obrigatorio>
        {(c) => (
          <Entrada
            {...c}
            value={designacao}
            placeholder={ehClasse ? t`Ex.: 11.ª classe` : t`Ex.: Ensino primário`}
            onChange={(e) => {
              setDesignacao(e.target.value)
              setErro(undefined)
            }}
          />
        )}
      </Campo>
    </Folha>
  )
}
