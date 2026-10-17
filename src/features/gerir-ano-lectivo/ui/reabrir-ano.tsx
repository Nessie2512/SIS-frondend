import { Trans, useLingui } from '@lingui/react/macro'
import { LockOpen } from 'lucide-react'
import { useState } from 'react'
import type { AnoLectivo } from '@/entities/ano-lectivo'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { AreaTexto, Aviso, Button, Campo, Dialogo, notificar } from '@/shared/ui'
import { useReabrirAno } from '../model/use-accoes-ano'

/** Reabrir um ano encerrado (guia 2.2, 2.4): só com justificação, para quem pode. */
export function ReabrirAno({ ano }: { ano: AnoLectivo }) {
  const { t } = useLingui()
  const reabrir = useReabrirAno(ano.id)
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string>()
  const designacao = ano.designacao

  function fechar() {
    setAberto(false)
    setMotivo('')
    setErro(undefined)
  }

  function confirmar() {
    if (motivo.trim().length < 10) {
      return setErro(t`Explique porque reabre (pelo menos 10 caracteres).`)
    }
    reabrir.mutate(motivo.trim(), {
      onSuccess: () => {
        const mensagem = t`O ano ${designacao} foi reaberto.`
        notificar.sucesso(mensagem)
        anunciar.educado(mensagem)
        fechar()
      },
      onError: (e) => setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e)),
    })
  }

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <LockOpen aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Reabrir o ano {designacao}</Trans>
      </Button>
      <Dialogo
        aberta={aberto}
        aoMudar={(v) => !v && fechar()}
        pendente={reabrir.isPending}
        titulo={t`Reabrir o ano ${designacao}`}
        descricao={t`As turmas voltam a activas e as matrículas concluídas voltam a confirmadas, com os resultados que tinham. Fica registado na auditoria.`}
        rodape={
          <>
            <Button onClick={fechar} disabled={reabrir.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={reabrir.isPending} onClick={confirmar}>
              <Trans>Reabrir</Trans>
            </Button>
          </>
        }
      >
        <Campo rotulo={t`Motivo`} erro={erro} obrigatorio>
          {(c) => (
            <AreaTexto
              {...c}
              rows={3}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                setErro(undefined)
              }}
            />
          )}
        </Campo>
        {erro && eApiError(reabrir.error) && reabrir.error.code === 'OUTRO_ANO_EM_CURSO' && (
          <Aviso tom="informacao">
            <Trans>Só pode haver um ano em curso de cada vez.</Trans>
          </Aviso>
        )}
      </Dialogo>
    </>
  )
}
