import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Turma } from '@/entities/turma'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { AreaTexto, Button, Campo, Dialogo, Dica, notificar } from '@/shared/ui'
import { useEncerrarTurma } from '../model/use-turmas'

/**
 * Encerrar a turma (guia 2.2): fica só de leitura. Com estudantes inscritos o botão fica
 * desactivado e diz o que fazer primeiro (guia 2.7).
 */
export function EncerrarTurma({ turma }: { turma: Turma }) {
  const { t } = useLingui()
  const encerrar = useEncerrarTurma()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string>()
  const designacao = turma.designacao
  const inscritos = turma.inscritos

  function fechar() {
    setAberto(false)
    setMotivo('')
    setErro(undefined)
  }

  function confirmar() {
    if (motivo.trim().length < 10) {
      return setErro(t`Explique porque encerra (pelo menos 10 caracteres).`)
    }
    encerrar.mutate(
      { turmaId: turma.id, motivo: motivo.trim() },
      {
        onSuccess: () => {
          const mensagem = t`Turma ${designacao} encerrada.`
          notificar.sucesso(mensagem)
          anunciar.educado(mensagem)
          fechar()
        },
        onError: (e) => setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e)),
      },
    )
  }

  if (inscritos > 0) {
    const razao = t`Mova primeiro os ${inscritos} estudantes para outra turma.`
    return (
      <>
        <Dica texto={razao}>
          <Button
            aria-disabled="true"
            aria-describedby="razao-encerrar-turma"
            className="opacity-50"
          >
            <Trans>Encerrar turma</Trans>
          </Button>
        </Dica>
        <span id="razao-encerrar-turma" className="sr-only">
          {razao}
        </span>
      </>
    )
  }

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Trans>Encerrar turma</Trans>
      </Button>
      <Dialogo
        aberta={aberto}
        aoMudar={(v) => !v && fechar()}
        pendente={encerrar.isPending}
        titulo={t`Encerrar a turma ${designacao}`}
        descricao={t`A turma fica só de leitura e deixa de receber inscrições. Os docentes atribuídos terminam hoje.`}
        rodape={
          <>
            <Button onClick={fechar} disabled={encerrar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="destrutivo" aCarregar={encerrar.isPending} onClick={confirmar}>
              <Trans>Encerrar {designacao}</Trans>
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
