import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Estudante } from '@/entities/estudante'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { AreaTexto, Button, Campo, Dialogo, notificar } from '@/shared/ui'
import { useAnularMatricula } from '../model/use-confirmar-matricula'

/**
 * Anular a matrícula (guia 2.2, 7.4): diálogo pequeno com o efeito escrito por extenso, em vez
 * de «Tem a certeza?». O motivo fica no percurso.
 */
export function AnularMatricula({ estudante }: { estudante: Estudante }) {
  const { t } = useLingui()
  const anular = useAnularMatricula()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string>()
  const nome = estudante.nome
  const matricula = estudante.matricula ?? ''

  function fechar() {
    setAberto(false)
    setMotivo('')
    setErro(undefined)
  }

  function confirmar() {
    if (!estudante.matriculaId) return
    if (motivo.trim().length < 10) {
      return setErro(t`Explique porque anula (pelo menos 10 caracteres).`)
    }
    anular.mutate(
      { matriculaId: estudante.matriculaId, motivo: motivo.trim() },
      {
        onSuccess: () => {
          const mensagem = t`Matrícula de ${nome} anulada.`
          notificar.sucesso(mensagem)
          anunciar.educado(mensagem)
          fechar()
        },
        onError: (e) => setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e)),
      },
    )
  }

  return (
    <>
      <Button variante="discreto" className="text-perigo" onClick={() => setAberto(true)}>
        <Trans>Anular matrícula</Trans>
      </Button>
      <Dialogo
        aberta={aberto}
        aoMudar={(v) => !v && fechar()}
        pendente={anular.isPending}
        titulo={t`Anular a matrícula`}
        descricao={t`Anula a matrícula de ${nome} (${matricula}). O lugar na turma fica livre. Não pode ser desfeito.`}
        rodape={
          <>
            <Button onClick={fechar} disabled={anular.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="destrutivo" aCarregar={anular.isPending} onClick={confirmar}>
              <Trans>Anular a matrícula</Trans>
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
      </Dialogo>
    </>
  )
}
