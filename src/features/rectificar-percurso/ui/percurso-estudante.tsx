import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Lock, PenLine } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { percursoQuery, type EventoPercurso } from '@/entities/estudante'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { formatarInstante } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  AreaTexto,
  Aviso,
  Button,
  Campo,
  Dialogo,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  notificar,
} from '@/shared/ui'
import { esquemaRectificacao, type DadosRectificacao } from '../model/esquema'
import { useRectificar } from '../model/use-rectificar'

interface Props {
  estudanteId: string
  /** Permissão e ano aberto */
  podeRectificar: boolean
}

/**
 * Percurso (guia 6.3): linha do tempo vertical por ano lectivo; cada entrada tem um cadeado
 * por ser imutável. Sem editar nem apagar: só Rectificar, com motivo, e a rectificação fica
 * ligada à entrada original, que continua visível (guia 2.4).
 */
export function PercursoEstudante({ estudanteId, podeRectificar }: Props) {
  const { t } = useLingui()
  const { data: eventos } = useQuery(percursoQuery(estudanteId))
  const [aRectificar, setARectificar] = useState<EventoPercurso | null>(null)
  if (!eventos) return <Esqueleto className="h-48 w-full" />
  if (!eventos.length) return <EstadoVazio titulo={t`Ainda não há registos no percurso.`} />

  const porId = new Map(eventos.map((e) => [e.id, e]))
  const rectificacoes = new Map<string, EventoPercurso>()
  // A mais recente de cada original (a lista vem da mais recente para a mais antiga)
  for (const e of eventos)
    if (e.rectificaId && !rectificacoes.has(e.rectificaId)) rectificacoes.set(e.rectificaId, e)

  const porAno = new Map<string, EventoPercurso[]>()
  for (const evento of eventos)
    porAno.set(evento.anoLectivo, [...(porAno.get(evento.anoLectivo) ?? []), evento])

  return (
    <div className="flex flex-col gap-8">
      {[...porAno].map(([ano, doAno]) => (
        <section key={ano} aria-labelledby={`ano-${ano}`}>
          <h2 id={`ano-${ano}`} className="tabular mb-3 text-subtitulo">
            {ano}
          </h2>
          <ol className="relative flex flex-col gap-5 border-l border-linha pl-6">
            {doAno.map((evento) => {
              const original = evento.rectificaId ? porId.get(evento.rectificaId) : undefined
              const rectificada = rectificacoes.get(evento.id)
              const dataOriginal = original ? formatarInstante(original.data) : ''
              const motivo = evento.motivo
              const descricao = evento.descricao
              return (
                <li key={evento.id} id={`evento-${evento.id}`} className="relative scroll-mt-24">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-fundo',
                      evento.rectificaId ? 'bg-aviso' : 'bg-acento',
                    )}
                  />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {evento.tipoRotulo}
                      <Lock
                        aria-label={t`Registo imutável`}
                        className="size-3 stroke-[1.5] text-texto-3"
                      />
                      {rectificada && (
                        <EtiquetaEstado tom="neutra">{t`Rectificada`}</EtiquetaEstado>
                      )}
                    </p>
                    {podeRectificar && !evento.rectificaId && (
                      <Button
                        variante="discreto"
                        tamanho="compacto"
                        aria-label={t`Rectificar: ${descricao}`}
                        onClick={() => setARectificar(evento)}
                      >
                        <PenLine aria-hidden className="size-4 stroke-[1.5]" />
                        <Trans>Rectificar</Trans>
                      </Button>
                    )}
                  </div>
                  <p className={cn(rectificada ? 'text-texto-2' : 'text-texto-1')}>
                    {evento.descricao}
                  </p>
                  {original && (
                    <p className="text-secundario text-texto-2">
                      <a href={`#evento-${original.id}`} className="text-acento hover:underline">
                        {t`Rectifica o registo de ${dataOriginal}`}
                      </a>
                      {motivo && <> · {t`Motivo: ${motivo}`}</>}
                    </p>
                  )}
                  {rectificada && (
                    <p className="text-secundario">
                      <a href={`#evento-${rectificada.id}`} className="text-acento hover:underline">
                        <Trans>Ver a rectificação</Trans>
                      </a>
                    </p>
                  )}
                  <p className="tabular text-secundario text-texto-3">
                    {formatarInstante(evento.data)} · {evento.autor}
                  </p>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <DialogoRectificar
        estudanteId={estudanteId}
        evento={aRectificar}
        aoFechar={() => setARectificar(null)}
      />
    </div>
  )
}

function DialogoRectificar({
  estudanteId,
  evento,
  aoFechar,
}: {
  estudanteId: string
  evento: EventoPercurso | null
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const rectificar = useRectificar(estudanteId)
  const [erroGeral, setErroGeral] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DadosRectificacao>({
    resolver: zodResolver(esquemaRectificacao),
    mode: 'onTouched',
    values: { descricao: evento?.descricao ?? '', motivo: '' },
  })

  function fechar() {
    reset()
    setErroGeral(undefined)
    aoFechar()
  }

  async function gravar(dados: DadosRectificacao) {
    if (!evento) return
    setErroGeral(undefined)
    try {
      await rectificar.mutateAsync({ evento, dados })
      notificar.sucesso(t`Rectificação registada no percurso.`)
      anunciar.educado(t`Rectificação registada no percurso.`)
      fechar()
    } catch (erro) {
      const deCampo = eApiError(erro) ? erro.errors : []
      for (const e of deCampo) {
        if (e.campo === 'descricao' || e.campo === 'motivo') {
          setError(e.campo, { message: e.mensagem })
        }
      }
      if (!deCampo.length) setErroGeral(mensagemDeErro(erro))
    }
  }

  const original = evento?.descricao ?? ''
  return (
    <Dialogo
      aberta={Boolean(evento)}
      aoMudar={(v) => !v && fechar()}
      pendente={rectificar.isPending}
      titulo={t`Rectificar o registo`}
      descricao={t`O registo original fica no percurso, marcado como rectificado. A rectificação entra como um registo novo, com o motivo, e não se apaga.`}
      rodape={
        <>
          <Button onClick={fechar} disabled={rectificar.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante="primario"
            type="submit"
            form="form-rectificar"
            aCarregar={rectificar.isPending}
          >
            <Trans>Registar rectificação</Trans>
          </Button>
        </>
      }
    >
      <form
        id="form-rectificar"
        noValidate
        onSubmit={(e) => void handleSubmit(gravar)(e)}
        className="flex flex-col gap-4"
      >
        {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
        <p className="text-secundario text-texto-2">{t`Registo original: «${original}»`}</p>
        <Campo rotulo={t`Registo correcto`} erro={errors.descricao?.message} obrigatorio>
          {(c) => <AreaTexto {...c} rows={2} {...register('descricao')} />}
        </Campo>
        <Campo rotulo={t`Motivo`} erro={errors.motivo?.message} obrigatorio>
          {(c) => (
            <AreaTexto
              {...c}
              rows={2}
              placeholder={t`Ex.: turma registada por engano`}
              {...register('motivo')}
            />
          )}
        </Campo>
      </form>
    </Dialogo>
  )
}
