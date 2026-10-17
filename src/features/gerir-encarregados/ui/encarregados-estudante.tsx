import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { encarregadosQuery, formatarTelefone, type Encarregado } from '@/entities/estudante'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  Campo,
  ControloSegmentado,
  Dica,
  Entrada,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  Folha,
  notificar,
  notificarComDesfazer,
} from '@/shared/ui'
import {
  pesquisaEncarregadosQuery,
  useAcrescentarEncarregado,
  useEditarEncarregado,
  useReligarEncarregado,
  useRetirarEncarregado,
  type DadosEncarregado,
} from '../model/use-encarregados'

interface Props {
  estudanteId: string
  nome: string
  podeEditar: boolean
}

/**
 * Encarregados do estudante (guia 2.1): a mesma pessoa serve vários irmãos e nunca se cria duas
 * vezes. Acrescentar procura primeiro quem já está registado; editar muda os dados da pessoa.
 */
export function EncarregadosEstudante({ estudanteId, nome, podeEditar }: Props) {
  const { t } = useLingui()
  const { data: encarregados } = useQuery(encarregadosQuery(estudanteId))
  const retirar = useRetirarEncarregado(estudanteId)
  const religar = useReligarEncarregado(estudanteId)
  const editarPrincipal = useEditarEncarregado(estudanteId)
  const [folha, setFolha] = useState<{ modo: 'novo' } | { modo: 'editar'; enc: Encarregado }>()
  if (!encarregados) return <Esqueleto className="h-32 w-full" />
  const unico = encarregados.length === 1

  function retirarEnc(enc: Encarregado) {
    const quem = enc.nome
    retirar.mutate(enc.id, { onError: (e) => notificar.erro(mensagemDeErro(e)) })
    anunciar.educado(t`${quem} deixou de ser encarregado de ${nome}.`)
    notificarComDesfazer(t`${quem} deixou de ser encarregado de ${nome}.`, () =>
      religar.mutate({ id: enc.id, principal: enc.principal }),
    )
  }

  function tornarPrincipal(enc: Encarregado) {
    const quem = enc.nome
    editarPrincipal.mutate(
      {
        id: enc.id,
        dados: {
          nome: enc.nome,
          parentesco: enc.parentesco,
          telefone: enc.telefone,
          email: enc.email ?? undefined,
          principal: true,
        },
      },
      {
        onSuccess: () => notificar.sucesso(t`${quem} passou a encarregado principal.`),
        onError: (e) => notificar.erro(mensagemDeErro(e)),
      },
    )
  }

  return (
    <section aria-labelledby="encarregados-titulo" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="encarregados-titulo" className="text-titulo-seccao">
          <Trans>Encarregados</Trans>
        </h2>
        {podeEditar && (
          <Button onClick={() => setFolha({ modo: 'novo' })}>
            <UserPlus aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Acrescentar encarregado</Trans>
          </Button>
        )}
      </div>
      {encarregados.length === 0 ? (
        <EstadoVazio titulo={t`Sem encarregados registados.`} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {encarregados.map((enc) => {
            const outros = enc.outrosEducandos
            const quem = enc.nome
            return (
              <li
                key={enc.id}
                aria-busy={enc.aGuardar || undefined}
                className={cn(
                  'flex flex-col gap-1 rounded-cartao bg-superficie p-4 ring-1 ring-linha',
                  enc.aGuardar && 'opacity-60',
                )}
              >
                <p className="flex flex-wrap items-center gap-2 text-subtitulo">
                  {enc.nome}
                  {enc.principal && <EtiquetaEstado tom="accao">{t`Principal`}</EtiquetaEstado>}
                  {enc.aGuardar && (
                    <span className="text-secundario font-normal text-texto-3">{t`A guardar…`}</span>
                  )}
                </p>
                <p className="text-texto-2">{enc.parentesco}</p>
                <p className="tabular">{formatarTelefone(enc.telefone)}</p>
                {enc.email && <p className="text-texto-2">{enc.email}</p>}
                {outros > 0 && (
                  <p className="text-secundario text-texto-3">
                    {outros === 1
                      ? t`Encarregado de mais 1 estudante.`
                      : t`Encarregado de mais ${outros} estudantes.`}
                  </p>
                )}
                {podeEditar && !enc.aGuardar && (
                  <div className="mt-2 flex flex-wrap gap-3 text-secundario">
                    <button
                      type="button"
                      aria-label={t`Editar ${quem}`}
                      onClick={() => setFolha({ modo: 'editar', enc })}
                      className="text-acento hover:underline"
                    >
                      <Trans>Editar</Trans>
                    </button>
                    {!enc.principal && (
                      <button
                        type="button"
                        aria-label={t`Tornar ${quem} o encarregado principal`}
                        onClick={() => tornarPrincipal(enc)}
                        className="text-acento hover:underline"
                      >
                        <Trans>Tornar principal</Trans>
                      </button>
                    )}
                    {unico ? (
                      <Dica texto={t`O estudante precisa de pelo menos um encarregado.`}>
                        <button
                          type="button"
                          aria-disabled="true"
                          aria-label={t`Retirar ${quem}`}
                          className="cursor-not-allowed text-texto-3"
                        >
                          <Trans>Retirar</Trans>
                        </button>
                      </Dica>
                    ) : (
                      <button
                        type="button"
                        aria-label={t`Retirar ${quem}`}
                        onClick={() => retirarEnc(enc)}
                        className="text-perigo hover:underline"
                      >
                        <Trans>Retirar</Trans>
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {folha && (
        <FolhaEncarregado
          estudanteId={estudanteId}
          nomeEstudante={nome}
          editar={folha.modo === 'editar' ? folha.enc : undefined}
          aoFechar={() => setFolha(undefined)}
        />
      )}
    </section>
  )
}

function FolhaEncarregado({
  estudanteId,
  nomeEstudante,
  editar,
  aoFechar,
}: {
  estudanteId: string
  nomeEstudante: string
  editar?: Encarregado
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const acrescentar = useAcrescentarEncarregado(estudanteId)
  const editarM = useEditarEncarregado(estudanteId)
  const [aberta, setAberta] = useState(true)
  const [modo, setModo] = useState<'existente' | 'novo'>(editar ? 'novo' : 'existente')
  const [dados, setDados] = useState({
    nome: editar?.nome ?? '',
    parentesco: editar?.parentesco ?? '',
    telefone: editar?.telefone ?? '',
    email: editar?.email ?? '',
    principal: editar?.principal ?? false,
  })
  const [pesquisa, setPesquisa] = useState('')
  const [pesquisaVista, setPesquisaVista] = useState('')
  const [escolhido, setEscolhido] = useState<{ id: string; nome: string }>()
  const [erros, setErros] = useState<Record<string, string>>({})
  const [existente, setExistente] = useState<{ id: string; nome: string }>()
  const [erroGeral, setErroGeral] = useState<string>()
  useEffect(() => {
    const espera = setTimeout(() => setPesquisaVista(pesquisa.trim()), 250)
    return () => clearTimeout(espera)
  }, [pesquisa])
  const { data: resultados = [], isFetching } = useQuery(pesquisaEncarregadosQuery(pesquisaVista))

  function fechar() {
    setAberta(false)
    aoFechar()
  }

  const campo = (k: keyof typeof dados) => (e: { target: { value: string } }) =>
    setDados((d) => ({ ...d, [k]: e.target.value }))

  function tratarErro(e: unknown) {
    if (eApiError(e) && e.code === 'ENCARREGADO_EXISTENTE') {
      setExistente({ id: String(e.dados.encarregadoId), nome: String(e.dados.nome) })
      return
    }
    const deCampo = eApiError(e) ? e.errors : []
    if (deCampo.length) setErros(Object.fromEntries(deCampo.map((x) => [x.campo, x.mensagem])))
    else setErroGeral(mensagemDeErro(e))
  }

  function ligar(id: string, quem: string) {
    setErroGeral(undefined)
    setAberta(false)
    acrescentar.mutate(
      { dados: { encarregadoId: id, principal: dados.principal }, nome: quem },
      {
        onSuccess: () => {
          notificar.sucesso(t`${quem} é agora encarregado de ${nomeEstudante}.`)
          aoFechar()
        },
        onError: (e) => {
          setAberta(true)
          tratarErro(e)
        },
      },
    )
  }

  function gravar() {
    setErros({})
    setErroGeral(undefined)
    setExistente(undefined)
    if (modo === 'existente' && !editar) {
      if (!escolhido) return setErros({ pesquisa: t`Escolha o encarregado da lista.` })
      return ligar(escolhido.id, escolhido.nome)
    }
    const corpo: DadosEncarregado = {
      nome: dados.nome,
      parentesco: dados.parentesco,
      telefone: dados.telefone,
      email: dados.email || undefined,
      principal: dados.principal,
    }
    if (editar) {
      editarM.mutate(
        { id: editar.id, dados: corpo },
        {
          onSuccess: () => {
            const quem = dados.nome
            notificar.sucesso(t`Dados de ${quem} guardados.`)
            fechar()
          },
          onError: tratarErro,
        },
      )
      return
    }
    // Semi-optimista: a folha fecha e o cartão aparece já, a guardar
    setAberta(false)
    acrescentar.mutate(
      { dados: corpo, nome: dados.nome },
      {
        onSuccess: () => {
          const quem = dados.nome
          notificar.sucesso(t`${quem} acrescentado como encarregado.`)
          anunciar.educado(t`${quem} acrescentado como encarregado.`)
          aoFechar()
        },
        onError: (e) => {
          setAberta(true)
          tratarErro(e)
        },
      },
    )
  }

  const titulo = editar ? t`Editar encarregado` : t`Acrescentar encarregado`
  const nomeExistente = existente?.nome ?? ''
  return (
    <Folha
      aberta={aberta}
      aoMudar={(v) => !v && fechar()}
      pendente={editarM.isPending}
      titulo={titulo}
      descricao={nomeEstudante}
      rodape={
        <>
          <Button onClick={fechar}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button variante="primario" aCarregar={editarM.isPending} onClick={gravar}>
            {editar ? (
              <Trans>Guardar</Trans>
            ) : modo === 'existente' ? (
              <Trans>Ligar ao estudante</Trans>
            ) : (
              <Trans>Acrescentar</Trans>
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!editar && (
          <ControloSegmentado
            rotulo={t`Quem é o encarregado`}
            valor={modo}
            aoMudar={(v) => setModo(v as 'existente' | 'novo')}
            opcoes={[
              { valor: 'existente', rotulo: t`Já registado` },
              { valor: 'novo', rotulo: t`Pessoa nova` },
            ]}
          />
        )}
        {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
        {existente && (
          <Aviso tom="aviso">
            <div className="flex flex-col gap-2">
              <p>{t`${nomeExistente} já está registado com este telefone. Ligue-o em vez de criar outra vez.`}</p>
              <Button
                tamanho="compacto"
                className="w-fit"
                onClick={() => ligar(existente.id, existente.nome)}
              >
                {t`Ligar ${nomeExistente}`}
              </Button>
            </div>
          </Aviso>
        )}
        {modo === 'existente' && !editar ? (
          <>
            <Campo
              rotulo={t`Procurar por nome ou telefone`}
              erro={erros.pesquisa}
              descricao={t`Por exemplo, o encarregado de um irmão.`}
            >
              {(c) => (
                <Entrada
                  {...c}
                  type="search"
                  value={pesquisa}
                  onChange={(e) => {
                    setPesquisa(e.target.value)
                    setEscolhido(undefined)
                  }}
                />
              )}
            </Campo>
            {pesquisaVista.length >= 2 && (
              <fieldset
                className={cn('flex flex-col gap-2', isFetching && 'opacity-60')}
                aria-busy={isFetching || undefined}
              >
                <legend className="sr-only">{t`Encarregados encontrados`}</legend>
                {resultados.length === 0 && !isFetching ? (
                  <p className="text-secundario text-texto-2">
                    <Trans>Ninguém encontrado. Escolha «Pessoa nova».</Trans>
                  </p>
                ) : (
                  resultados.map((r) => (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-start gap-3 rounded-cartao px-3 py-2.5 ring-1 ring-linha has-checked:ring-2 has-checked:ring-acento"
                    >
                      <input
                        type="radio"
                        name="encarregado-existente"
                        checked={escolhido?.id === r.id}
                        onChange={() => setEscolhido({ id: r.id, nome: r.nome })}
                        className="mt-0.5 size-4 accent-(--color-acento)"
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{r.nome}</span>
                        <span className="tabular text-secundario text-texto-2">
                          {formatarTelefone(r.telefone)}
                          {r.educandos.length > 0 &&
                            ` · ${t`encarregado de`} ${r.educandos.join(', ')}`}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </fieldset>
            )}
          </>
        ) : (
          <>
            <Campo rotulo={t`Nome completo`} erro={erros.nome} obrigatorio>
              {(c) => <Entrada {...c} value={dados.nome} onChange={campo('nome')} />}
            </Campo>
            <Campo rotulo={t`Parentesco`} erro={erros.parentesco} obrigatorio>
              {(c) => <Entrada {...c} value={dados.parentesco} onChange={campo('parentesco')} />}
            </Campo>
            <Campo rotulo={t`Telefone`} erro={erros.telefone} obrigatorio>
              {(c) => (
                <Entrada
                  {...c}
                  inputMode="tel"
                  value={dados.telefone}
                  onChange={campo('telefone')}
                />
              )}
            </Campo>
            <Campo rotulo={t`Email`} descricao={t`Opcional.`}>
              {(c) => <Entrada {...c} type="email" value={dados.email} onChange={campo('email')} />}
            </Campo>
          </>
        )}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={dados.principal}
            onChange={(e) => setDados((d) => ({ ...d, principal: e.target.checked }))}
            className="size-4 accent-(--color-acento)"
          />
          <Trans>Encarregado principal</Trans>
        </label>
      </div>
    </Folha>
  )
}
