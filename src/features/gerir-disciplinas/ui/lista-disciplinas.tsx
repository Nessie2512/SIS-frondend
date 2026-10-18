import { plural } from '@lingui/core/macro'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { disciplinasQuery, type Disciplina } from '@/entities/disciplina'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  Campo,
  Dialogo,
  Entrada,
  Esqueleto,
  EtiquetaEstado,
  Folha,
  notificar,
  notificarComDesfazer,
} from '@/shared/ui'
import { esquemaDisciplina, type DadosDisciplina } from '../model/esquema'
import {
  useAlterarEstadoDisciplina,
  useCriarDisciplina,
  useEliminarDisciplina,
} from '../model/use-disciplinas'

/**
 * Disciplinas (guia 2.4, 2.5, 7.3): criar em folha lateral; o que está em uso não se elimina,
 * inactiva-se, e a acção diz o que mantém; inactivar e reactivar têm Desfazer.
 */
export function ListaDisciplinas({ podeEditar }: { podeEditar: boolean }) {
  const { t } = useLingui()
  const { data: disciplinas } = useQuery(disciplinasQuery())
  const alterarEstado = useAlterarEstadoDisciplina()
  const [aCriar, setACriar] = useState(false)
  const [aEliminar, setAEliminar] = useState<Disciplina | null>(null)

  function mudarEstado(d: Disciplina) {
    const nome = d.nome
    const novo = d.activa ? 'INACTIVA' : 'ACTIVA'
    alterarEstado.mutate(
      { id: d.id, estado: novo },
      { onError: (erro) => notificar.erro(mensagemDeErro(erro)) },
    )
    notificarComDesfazer(
      d.activa
        ? t`${nome} inactivada. Continua nos planos e no histórico, mas não se acrescenta a novos planos.`
        : t`${nome} reactivada.`,
      () =>
        alterarEstado.mutate(
          { id: d.id, estado: d.estado },
          { onError: (erro) => notificar.erro(mensagemDeErro(erro)) },
        ),
    )
  }

  if (!disciplinas) return <Esqueleto className="h-96 w-full" />
  const activas = disciplinas.filter((d) => d.activa).length

  return (
    <section aria-labelledby="titulo-disciplinas" className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="titulo-disciplinas" className="text-titulo-pagina">
            <Trans>Disciplinas</Trans>
          </h1>
          <p className="tabular text-secundario text-texto-2">
            {plural(activas, { one: '# activa', other: '# activas' })}
          </p>
        </div>
        {podeEditar && (
          <Button variante="primario" data-atalho="novo" onClick={() => setACriar(true)}>
            <Plus aria-hidden />
            <Trans>Nova disciplina</Trans>
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-cartao bg-superficie ring-1 ring-linha">
        <table className="w-full text-left text-corpo">
          <caption className="sr-only">{t`Disciplinas`}</caption>
          <thead className="text-legenda text-texto-2">
            <tr className="border-b border-linha">
              <th scope="col" className="px-4 py-2.5 font-medium">
                <Trans>Disciplina</Trans>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <Trans>Sigla</Trans>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <Trans>Estado</Trans>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <Trans>Utilização</Trans>
              </th>
              {podeEditar && (
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">
                    <Trans>Acções</Trans>
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {disciplinas.map((d) => {
              const nome = d.nome
              return (
                <tr key={d.id} className="h-linha border-b border-linha last:border-0">
                  <td className="px-4 font-medium">{nome}</td>
                  <td className="tabular px-4 text-texto-2">{d.sigla}</td>
                  <td className="px-4">
                    {d.activa ? (
                      <EtiquetaEstado tom="sucesso">{t`Activa`}</EtiquetaEstado>
                    ) : (
                      <EtiquetaEstado tom="neutra">{t`Inactiva`}</EtiquetaEstado>
                    )}
                  </td>
                  <td className="px-4 text-texto-2">
                    {d.emUso ? t`Em planos ou habilitações` : t`Sem uso`}
                  </td>
                  {podeEditar && (
                    <td className="px-4 text-right whitespace-nowrap">
                      <Button
                        variante="discreto"
                        tamanho="compacto"
                        aria-label={d.activa ? t`Inactivar ${nome}` : t`Reactivar ${nome}`}
                        onClick={() => mudarEstado(d)}
                      >
                        {d.activa ? <Trans>Inactivar</Trans> : <Trans>Reactivar</Trans>}
                      </Button>
                      {!d.emUso && (
                        <Button
                          variante="discreto"
                          tamanho="compacto"
                          aria-label={t`Eliminar ${nome}`}
                          onClick={() => setAEliminar(d)}
                        >
                          <Trans>Eliminar</Trans>
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <FolhaNovaDisciplina aberta={aCriar} aoFechar={() => setACriar(false)} />
      <DialogoEliminar disciplina={aEliminar} aoFechar={() => setAEliminar(null)} />
    </section>
  )
}

function FolhaNovaDisciplina({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const { t } = useLingui()
  const criar = useCriarDisciplina()
  const [erroGeral, setErroGeral] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DadosDisciplina>({
    resolver: zodResolver(esquemaDisciplina),
    mode: 'onTouched',
    defaultValues: { nome: '', sigla: '' },
  })

  function fechar() {
    reset()
    setErroGeral(undefined)
    aoFechar()
  }

  async function gravar(dados: DadosDisciplina) {
    setErroGeral(undefined)
    try {
      const nova = await criar.mutateAsync(dados)
      const nome = nova.nome
      notificar.sucesso(t`Disciplina ${nome} criada.`)
      anunciar.educado(t`Disciplina ${nome} criada.`)
      fechar()
    } catch (erro) {
      // O que o utilizador escreveu fica; os erros voltam aos campos (guia 5.5, 7.2)
      const deCampo = eApiError(erro) ? erro.errors : []
      for (const e of deCampo) {
        if (e.campo === 'nome' || e.campo === 'sigla') setError(e.campo, { message: e.mensagem })
      }
      if (!deCampo.length) setErroGeral(mensagemDeErro(erro))
    }
  }

  return (
    <Folha
      aberta={aberta}
      aoMudar={(v) => !v && fechar()}
      pendente={criar.isPending}
      titulo={t`Nova disciplina`}
      descricao={t`Depois de criada, pode ser acrescentada aos rascunhos dos planos.`}
      rodape={
        <>
          <Button onClick={fechar} disabled={criar.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante="primario"
            type="submit"
            form="form-nova-disciplina"
            aCarregar={criar.isPending}
          >
            <Trans>Criar disciplina</Trans>
          </Button>
        </>
      }
    >
      <form
        id="form-nova-disciplina"
        noValidate
        onSubmit={(e) => void handleSubmit(gravar)(e)}
        className="flex flex-col gap-4"
      >
        {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
        <Campo rotulo={t`Nome`} erro={errors.nome?.message} obrigatorio>
          {(c) => <Entrada {...c} placeholder={t`Ex.: Educação Ambiental`} {...register('nome')} />}
        </Campo>
        <Campo
          rotulo={t`Sigla`}
          descricao={t`2 a 5 letras, usada nos horários e pautas.`}
          erro={errors.sigla?.message}
          obrigatorio
        >
          {(c) => (
            <Entrada
              {...c}
              className="w-32 uppercase"
              maxLength={5}
              autoComplete="off"
              {...register('sigla')}
            />
          )}
        </Campo>
      </form>
    </Folha>
  )
}

function DialogoEliminar({
  disciplina,
  aoFechar,
}: {
  disciplina: Disciplina | null
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const eliminar = useEliminarDisciplina()
  const nome = disciplina?.nome ?? ''
  return (
    <Dialogo
      aberta={Boolean(disciplina)}
      aoMudar={(v) => !v && aoFechar()}
      pendente={eliminar.isPending}
      titulo={t`Eliminar ${nome}?`}
      descricao={t`A disciplina sai da lista. Não está em nenhum plano nem habilitação, por isso nada mais muda.`}
      rodape={
        <>
          <Button onClick={aoFechar} disabled={eliminar.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante="destrutivo"
            aCarregar={eliminar.isPending}
            onClick={() =>
              disciplina &&
              eliminar.mutate(disciplina, {
                onSuccess: () => {
                  notificar.sucesso(t`Disciplina ${nome} eliminada.`)
                  aoFechar()
                },
                onError: (erro) => {
                  notificar.erro(mensagemDeErro(erro))
                  aoFechar()
                },
              })
            }
          >
            <Trans>Eliminar disciplina</Trans>
          </Button>
        </>
      }
    />
  )
}
