import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { Lock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  dataPorExtenso,
  eventosDe,
  intervaloCurto,
  trimestreDe,
  type Calendario,
  type Evento,
} from '@/entities/calendario'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Aviso,
  Button,
  Campo,
  ControloSegmentado,
  Entrada,
  EtiquetaEstado,
  Folha,
  notificar,
  notificarComDesfazer,
  SelectorData,
} from '@/shared/ui'
import { esquemaEvento, TIPOS_CRIAVEIS, type DadosEvento } from '../model/esquema'
import { useApagarEvento, useCriarEvento } from '../model/use-eventos'

interface Props {
  /** Dia aberto (AAAA-MM-DD) ou nada */
  dia: string | undefined
  calendario: Calendario
  anoLectivoId: string
  fimDoAno: string
  podeEditar: boolean
  /** Razão para não poder editar (ex.: ano encerrado), mostrada junto do formulário */
  soLeituraPorque?: string
  aoFechar: () => void
}

const TOM: Record<Evento['tipo'], 'perigo' | 'accao' | 'neutra' | 'aviso'> = {
  FERIADO: 'perigo',
  DATA_CHAVE: 'accao',
  INTERRUPCAO: 'aviso',
  EVENTO: 'neutra',
}

/**
 * Um dia do calendário (guia 6.3, 7.3): o que acontece nesse dia e, para quem pode,
 * criar um evento a partir dele numa folha lateral. Apagar tem Desfazer.
 */
export function FolhaDia({
  dia,
  calendario,
  anoLectivoId,
  fimDoAno,
  podeEditar,
  soLeituraPorque,
  aoFechar,
}: Props) {
  const { t } = useLingui()
  const apagar = useApagarEvento(anoLectivoId)
  const criar = useCriarEvento(anoLectivoId)
  const eventos = dia ? eventosDe(dia, calendario.eventos) : []
  const trimestre = dia ? trimestreDe(dia, calendario.trimestres)?.rotulo : undefined

  function apagarEvento(evento: Evento) {
    const titulo = evento.titulo
    apagar.mutate(evento, { onError: (erro) => notificar.erro(mensagemDeErro(erro)) })
    notificarComDesfazer(t`«${titulo}» apagado do calendário.`, () =>
      criar.mutate(
        {
          titulo: evento.titulo,
          tipo: evento.tipo === 'FERIADO' ? 'EVENTO' : evento.tipo,
          inicio: evento.inicio,
          fim: evento.fim,
        },
        { onError: (erro) => notificar.erro(mensagemDeErro(erro)) },
      ),
    )
  }

  return (
    <Folha
      aberta={Boolean(dia)}
      aoMudar={(v) => !v && aoFechar()}
      titulo={dia ? dataPorExtenso(dia) : t`Dia`}
      descricao={trimestre ?? t`Fora dos trimestres`}
    >
      {dia && (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="eventos-dia" className="flex flex-col gap-3">
            <h3 id="eventos-dia" className="text-subtitulo">
              <Trans>Neste dia</Trans>
            </h3>
            {eventos.length === 0 ? (
              <p className="text-texto-2">
                <Trans>Sem eventos.</Trans>
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-linha">
                {eventos.map((e) => {
                  const titulo = e.titulo
                  return (
                    <li key={e.id} className="flex items-start gap-3 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="font-medium">{titulo}</span>
                        <span className="flex flex-wrap items-center gap-2 text-secundario text-texto-2">
                          <EtiquetaEstado tom={TOM[e.tipo]}>{e.tipoRotulo}</EtiquetaEstado>
                          {e.inicio !== e.fim && (
                            <span className="tabular">{intervaloCurto(e.inicio, e.fim)}</span>
                          )}
                        </span>
                      </div>
                      {e.fixo ? (
                        <Lock
                          aria-label={t`Feriado nacional: não se apaga`}
                          className="mt-1 size-4 stroke-[1.5] text-texto-3"
                        />
                      ) : (
                        podeEditar && (
                          <Button
                            variante="discreto"
                            tamanho="icone"
                            className="size-8"
                            aria-label={t`Apagar «${titulo}»`}
                            onClick={() => apagarEvento(e)}
                          >
                            <Trash2 aria-hidden className="size-4 stroke-[1.5]" />
                          </Button>
                        )
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {podeEditar ? (
            <NovoEvento
              key={dia}
              dia={dia}
              fimDoAno={fimDoAno}
              aGuardar={criar.isPending}
              aoGuardar={(dados) => criar.mutateAsync({ ...dados, inicio: dia })}
            />
          ) : (
            soLeituraPorque && <Aviso tom="leitura">{soLeituraPorque}</Aviso>
          )}
        </div>
      )}
    </Folha>
  )
}

function NovoEvento({
  dia,
  fimDoAno,
  aGuardar,
  aoGuardar,
}: {
  dia: string
  fimDoAno: string
  aGuardar: boolean
  aoGuardar: (dados: DadosEvento) => Promise<Evento>
}) {
  const { t } = useLingui()
  const [erroGeral, setErroGeral] = useState<string>()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DadosEvento>({
    resolver: zodResolver(esquemaEvento(dia, fimDoAno)),
    mode: 'onTouched',
    defaultValues: { titulo: '', tipo: 'EVENTO', fim: dia },
  })

  const ROTULOS: Record<(typeof TIPOS_CRIAVEIS)[number], string> = {
    EVENTO: t`Evento`,
    DATA_CHAVE: t`Data-chave`,
    INTERRUPCAO: t`Interrupção`,
  }

  async function gravar(dados: DadosEvento) {
    setErroGeral(undefined)
    try {
      const evento = await aoGuardar(dados)
      const titulo = evento.titulo
      notificar.sucesso(t`«${titulo}» acrescentado ao calendário.`)
      anunciar.educado(t`«${titulo}» acrescentado ao calendário.`)
      reset({ titulo: '', tipo: dados.tipo, fim: dia })
    } catch (erro) {
      const deCampo = eApiError(erro) ? erro.errors : []
      for (const e of deCampo) {
        if (e.campo === 'titulo' || e.campo === 'fim' || e.campo === 'tipo') {
          setError(e.campo, { message: e.mensagem })
        }
      }
      if (!deCampo.length) setErroGeral(mensagemDeErro(erro))
    }
  }

  return (
    <section aria-labelledby="novo-evento" className="flex flex-col gap-4">
      <h3 id="novo-evento" className="text-subtitulo">
        <Trans>Novo evento a partir deste dia</Trans>
      </h3>
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(gravar)(e)}
        className="flex flex-col gap-4"
      >
        {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
        <Campo rotulo={t`Nome`} erro={errors.titulo?.message} obrigatorio>
          {(c) => (
            <Entrada
              {...c}
              placeholder={t`Ex.: Reunião de pais da 7.ª classe`}
              {...register('titulo')}
            />
          )}
        </Campo>
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-legenda text-texto-2">
                <Trans>Tipo</Trans>
              </span>
              <ControloSegmentado
                rotulo={t`Tipo de evento`}
                valor={field.value}
                aoMudar={(v) => field.onChange(v)}
                opcoes={TIPOS_CRIAVEIS.map((tipo) => ({ valor: tipo, rotulo: ROTULOS[tipo] }))}
              />
            </div>
          )}
        />
        <Controller
          control={control}
          name="fim"
          render={({ field }) => (
            <SelectorData
              rotulo={t`Último dia`}
              descricao={t`Igual ao primeiro num evento de um só dia.`}
              valor={field.value}
              aoMudar={(v) => field.onChange(v ?? '')}
              minimo={dia}
              maximo={fimDoAno}
              erro={errors.fim?.message}
            />
          )}
        />
        <Button type="submit" variante="primario" aCarregar={aGuardar} className="self-start">
          <Trans>Acrescentar ao calendário</Trans>
        </Button>
      </form>
    </section>
  )
}
