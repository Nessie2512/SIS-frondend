import { Trans, useLingui } from '@lingui/react/macro'
import { useBlocker } from '@tanstack/react-router'
import { Button } from './button'
import { Dialogo } from './folha'

interface Props {
  /** Há alterações por guardar */
  sujo: boolean
  /** Quando existe, oferece manter o rascunho antes de sair (guia 7.2) */
  aoManterRascunho?: () => void | Promise<void>
}

/**
 * Aviso ao sair só quando há alterações por guardar (guia 7.2): dentro da aplicação mostra um
 * diálogo; ao fechar o separador usa o aviso nativo do navegador.
 */
export function AvisoAoSair({ sujo, aoManterRascunho }: Props) {
  const { t } = useLingui()
  const bloqueio = useBlocker({
    shouldBlockFn: () => sujo,
    enableBeforeUnload: () => sujo,
    withResolver: true,
  })
  const aberto = bloqueio.status === 'blocked'

  return (
    <Dialogo
      aberta={aberto}
      aoMudar={(v) => !v && bloqueio.reset?.()}
      titulo={t`Há alterações por guardar`}
      descricao={t`Se sair agora, o que escreveu neste ecrã perde-se.`}
      rodape={
        <>
          <Button onClick={() => bloqueio.reset?.()}>
            <Trans>Continuar a editar</Trans>
          </Button>
          {aoManterRascunho ? (
            <Button
              variante="primario"
              onClick={async () => {
                await aoManterRascunho()
                bloqueio.proceed?.()
              }}
            >
              <Trans>Guardar rascunho e sair</Trans>
            </Button>
          ) : null}
          <Button
            variante={aoManterRascunho ? 'discreto' : 'destrutivo'}
            onClick={() => bloqueio.proceed?.()}
          >
            <Trans>Sair sem guardar</Trans>
          </Button>
        </>
      }
    >
      {null}
    </Dialogo>
  )
}
