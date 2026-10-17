import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { BookmarkPlus, X } from 'lucide-react'
import { useState } from 'react'
import {
  filtrosDaVista,
  mesmosFiltros,
  vistasQuery,
  type EcraVista,
  type FiltrosVista,
  type Vista,
} from '@/entities/vista'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Button, Campo, Dialogo, Entrada, notificar, notificarComDesfazer } from '@/shared/ui'
import { useApagarVista, useGuardarVista } from '../model/use-vistas'

interface Props {
  ecra: EcraVista
  /** Pesquisa actual do URL; página e item aberto são ignorados */
  pesquisa: Record<string, unknown>
  /** Aplica os filtros da vista (a rota valida-os e repõe a página 1) */
  aoAplicar: (filtros: FiltrosVista) => void
  className?: string
}

/**
 * Vistas guardadas por utilizador (guia 7.1): listadas ao lado da pesquisa, como etiquetas.
 * A vista que corresponde aos filtros actuais fica assinalada; guardar só faz sentido quando
 * há filtros e ainda não existe uma vista igual.
 */
export function VistasGuardadas({ ecra, pesquisa, aoAplicar, className }: Props) {
  const { t } = useLingui()
  const { data: vistas = [] } = useQuery(vistasQuery(ecra))
  const apagar = useApagarVista(ecra)
  const guardar = useGuardarVista(ecra)
  const [aGuardar, setAGuardar] = useState(false)

  const actuais = filtrosDaVista(pesquisa)
  const temFiltros = Object.keys(actuais).length > 0
  const activa = vistas.find((v) => mesmosFiltros(v.filtros, actuais))

  function apagarVista(vista: Vista) {
    const nome = vista.nome
    apagar.mutate(vista, {
      onSuccess: () =>
        notificarComDesfazer(t`Vista «${nome}» apagada.`, () =>
          guardar.mutate({ nome: vista.nome, filtros: vista.filtros }),
        ),
      onError: (erro) => notificar.erro(mensagemDeErro(erro)),
    })
  }

  if (vistas.length === 0 && !temFiltros) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {vistas.length > 0 && (
        <ul aria-label={t`Vistas guardadas`} className="flex flex-wrap items-center gap-1.5">
          {vistas.map((vista) => {
            const nome = vista.nome
            const eActiva = vista.id === activa?.id
            return (
              <li
                key={vista.id}
                className={cn(
                  'group flex h-7 items-center rounded-full text-secundario ring-1 transition-colors duration-(--duracao-micro)',
                  eActiva
                    ? 'bg-acento/10 text-texto-1 ring-acento/40'
                    : 'bg-superficie text-texto-2 ring-linha hover:text-texto-1',
                )}
              >
                <button
                  type="button"
                  aria-pressed={eActiva}
                  onClick={() => {
                    aoAplicar(vista.filtros)
                    anunciar.educado(t`Vista «${nome}» aplicada.`)
                  }}
                  className="h-full rounded-l-full pr-1 pl-3 outline-none focus-visible:ring-2 focus-visible:ring-acento"
                >
                  {nome}
                </button>
                <button
                  type="button"
                  aria-label={t`Apagar a vista «${nome}»`}
                  onClick={() => apagarVista(vista)}
                  className="mr-0.5 flex size-6 items-center justify-center rounded-full text-texto-3 outline-none hover:bg-fundo hover:text-texto-1 focus-visible:ring-2 focus-visible:ring-acento"
                >
                  <X aria-hidden className="size-3.5 stroke-[1.5]" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {temFiltros && !activa && (
        <Button tamanho="compacto" variante="discreto" onClick={() => setAGuardar(true)}>
          <BookmarkPlus aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Guardar vista</Trans>
        </Button>
      )}
      <DialogoGuardar
        aberta={aGuardar}
        aoFechar={() => setAGuardar(false)}
        aGuardar={guardar.isPending}
        aoGuardar={(nome, aoErro) =>
          guardar.mutate(
            { nome, filtros: actuais },
            {
              onSuccess: () => {
                setAGuardar(false)
                notificar.sucesso(t`Vista «${nome}» guardada.`)
              },
              onError: aoErro,
            },
          )
        }
      />
    </div>
  )
}

function DialogoGuardar({
  aberta,
  aoFechar,
  aGuardar,
  aoGuardar,
}: {
  aberta: boolean
  aoFechar: () => void
  aGuardar: boolean
  aoGuardar: (nome: string, aoErro: (erro: unknown) => void) => void
}) {
  const { t } = useLingui()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string>()

  function fechar() {
    setNome('')
    setErro(undefined)
    aoFechar()
  }

  function submeter() {
    const limpo = nome.trim()
    if (limpo.length < 2) return setErro(t`Dê um nome à vista.`)
    aoGuardar(limpo, (falha) => {
      const doCampo = eApiError(falha) ? falha.errors.find((e) => e.campo === 'nome') : undefined
      setErro(doCampo?.mensagem ?? mensagemDeErro(falha))
    })
    setNome(limpo)
  }

  return (
    <Dialogo
      aberta={aberta}
      aoMudar={(v) => !v && fechar()}
      pendente={aGuardar}
      titulo={t`Guardar vista`}
      descricao={t`Os filtros actuais ficam guardados com este nome, só para si.`}
      rodape={
        <>
          <Button onClick={fechar} disabled={aGuardar}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button variante="primario" type="submit" form="form-guardar-vista" aCarregar={aGuardar}>
            <Trans>Guardar</Trans>
          </Button>
        </>
      }
    >
      <form
        id="form-guardar-vista"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submeter()
        }}
      >
        <Campo rotulo={t`Nome da vista`} erro={erro} obrigatorio>
          {(c) => (
            <Entrada
              {...c}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- diálogo de um só campo
              autoFocus
              value={nome}
              maxLength={60}
              placeholder={t`Ex.: 7.ª classe sem turma`}
              onChange={(e) => {
                setNome(e.target.value)
                if (erro) setErro(undefined)
              }}
            />
          )}
        </Campo>
      </form>
    </Dialogo>
  )
}
