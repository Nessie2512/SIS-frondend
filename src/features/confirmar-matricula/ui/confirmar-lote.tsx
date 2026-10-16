import { Trans, useLingui } from '@lingui/react/macro'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import type { Matricula } from '@/entities/matricula'
import { novaChaveIdempotencia } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Button, Dialogo, notificar } from '@/shared/ui'
import { useConfirmarLote } from '../model/use-confirmar-matricula'

interface Props {
  /** Matrículas seleccionadas (da página actual) */
  seleccionadas: Matricula[]
  aoTerminar: () => void
}

/**
 * Acção em lote (guia 7.1): antes de aplicar, mostra o efeito — quantas ficam confirmadas,
 * quais ficam por confirmar e porquê — e o botão diz o número exacto de registos afectados.
 */
export function ConfirmarLote({ seleccionadas, aoTerminar }: Props) {
  const { t } = useLingui()
  const [aberta, setAberta] = useState(false)
  const [chave, setChave] = useState(novaChaveIdempotencia)
  const lote = useConfirmarLote()

  const confirmaveis = seleccionadas.filter(
    (m) => m.estado === 'PENDENTE' && m.documentosEmFalta === 0,
  )
  const comFalta = seleccionadas.filter((m) => m.estado === 'PENDENTE' && m.documentosEmFalta > 0)
  const jaConfirmadas = seleccionadas.length - confirmaveis.length - comFalta.length
  const n = confirmaveis.length

  function aplicar() {
    lote.mutate(
      { ids: confirmaveis.map((m) => m.id), chave },
      {
        onSuccess: ({ confirmadas, recusadas }) => {
          const feitas = confirmadas.length
          const falhadas = recusadas.length
          const mensagem =
            falhadas === 0
              ? t`${feitas} matrículas confirmadas.`
              : t`${feitas} matrículas confirmadas; ${falhadas} ficaram por confirmar.`
          notificar.sucesso(mensagem)
          anunciar.educado(mensagem)
          setAberta(false)
          setChave(novaChaveIdempotencia())
          aoTerminar()
        },
        onError: (erro) => notificar.erro(mensagemDeErro(erro), aplicar),
      },
    )
  }

  return (
    <>
      <Button variante="primario" tamanho="compacto" onClick={() => setAberta(true)}>
        <CircleCheck aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Confirmar…</Trans>
      </Button>
      <Dialogo
        aberta={aberta}
        aoMudar={setAberta}
        pendente={lote.isPending}
        titulo={t`Confirmar matrículas`}
        descricao={
          n === 0
            ? t`Nenhuma das matrículas escolhidas pode ser confirmada agora.`
            : n === 1
              ? t`1 matrícula fica confirmada.`
              : t`${n} matrículas ficam confirmadas.`
        }
        rodape={
          <>
            <Button onClick={() => setAberta(false)} disabled={lote.isPending}>
              {n > 0 ? <Trans>Cancelar</Trans> : <Trans>Fechar</Trans>}
            </Button>
            {n > 0 && (
              <Button variante="primario" aCarregar={lote.isPending} onClick={aplicar}>
                {n === 1 ? t`Confirmar 1 matrícula` : t`Confirmar ${n} matrículas`}
              </Button>
            )}
          </>
        }
      >
        <div className="flex max-h-72 flex-col gap-4 overflow-y-auto text-secundario">
          {comFalta.length > 0 && (
            <section aria-label={t`Ficam por confirmar`} className="flex flex-col gap-1.5">
              <h3 className="font-medium text-texto-1">
                {t`Ficam por confirmar (faltam documentos):`}
              </h3>
              <ul className="flex flex-col gap-1 text-texto-2">
                {comFalta.map((m) => {
                  const nome = m.estudanteNome
                  const falta = m.documentosEmFalta
                  return (
                    <li key={m.id} className="flex justify-between gap-4">
                      <span>{nome}</span>
                      <span className="tabular">{t`${falta} em falta`}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {jaConfirmadas > 0 && (
            <p className="text-texto-2">
              {jaConfirmadas === 1
                ? t`1 já estava confirmada e não muda.`
                : t`${jaConfirmadas} já estavam confirmadas e não mudam.`}
            </p>
          )}
        </div>
      </Dialogo>
    </>
  )
}
