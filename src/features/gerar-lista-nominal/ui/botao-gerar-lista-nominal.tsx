import { Trans, useLingui } from '@lingui/react/macro'
import { FileText } from 'lucide-react'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Button, notificar } from '@/shared/ui'
import { useGerarListaNominal } from '../model/use-gerar-lista-nominal'

export function BotaoGerarListaNominal({ turmaId }: { turmaId: string }) {
  const { t } = useLingui()
  const gerar = useGerarListaNominal()
  return (
    <Button
      aCarregar={gerar.isPending}
      onClick={() =>
        gerar.mutate(turmaId, {
          onSuccess: () =>
            anunciar.educado(t`A lista nominal está a ser gerada. Acompanhe no quadro de tarefas.`),
          onError: (erro) => notificar.erro(mensagemDeErro(erro), () => gerar.mutate(turmaId)),
        })
      }
    >
      <FileText aria-hidden className="size-4 stroke-[1.5]" />
      <Trans>Gerar lista nominal</Trans>
    </Button>
  )
}
