import { Trans, useLingui } from '@lingui/react/macro'
import type { Conta } from '@/entities/administracao'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Button, notificar, notificarComDesfazer } from '@/shared/ui'
import { useAlterarEstadoUtilizador } from '../model/use-alterar-estado-utilizador'

/**
 * Activar ou desactivar a conta (guia 2.2, 5.2): muda já, com Desfazer durante 8 s.
 * Uma conta inactiva deixa de entrar na aplicação; o histórico mantém-se.
 */
export function BotaoEstadoUtilizador({ conta }: { conta: Pick<Conta, 'id' | 'nome' | 'estado'> }) {
  const { t } = useLingui()
  const alterar = useAlterarEstadoUtilizador()
  const nome = conta.nome
  const activa = conta.estado === 'ACTIVO'

  function mudar() {
    const anterior = conta.estado
    const estado = activa ? 'INACTIVO' : 'ACTIVO'
    const aoFalhar = { onError: (erro: Error) => notificar.erro(mensagemDeErro(erro)) }
    alterar.mutate({ utilizadorId: conta.id, estado }, aoFalhar)
    const mensagem = activa ? t`${nome} já não pode entrar.` : t`${nome} pode voltar a entrar.`
    anunciar.educado(mensagem)
    notificarComDesfazer(mensagem, () =>
      alterar.mutate({ utilizadorId: conta.id, estado: anterior }, aoFalhar),
    )
  }

  return (
    <Button
      tamanho="compacto"
      aria-label={activa ? t`Desactivar ${nome}` : t`Activar ${nome}`}
      onClick={(e) => {
        e.stopPropagation()
        mudar()
      }}
    >
      {activa ? <Trans>Desactivar</Trans> : <Trans>Activar</Trans>}
    </Button>
  )
}
