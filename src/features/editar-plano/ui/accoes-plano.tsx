import { Trans, useLingui } from '@lingui/react/macro'
import { CopyPlus, Send } from 'lucide-react'
import { useState } from 'react'
import type { Plano, PlanoResumo } from '@/entities/plano'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Dialogo, notificar } from '@/shared/ui'
import { useNovaVersao, usePublicarPlano } from '../model/use-versoes'

interface Props {
  plano: Plano
  /** Todas as versões da classe, para saber se já há rascunho */
  versoes: PlanoResumo[]
  classe: string
  /** Abre outra versão (rascunho criado ou existente, vigente depois de publicar) */
  aoAbrir: (planoId: string) => void
}

/**
 * Versões do plano (guia 2.2): só o rascunho se edita; o vigente muda-se criando uma nova
 * versão; publicar é irreversível e diz o efeito concreto antes de confirmar (guia 7.3).
 */
export function AccoesPlano({ plano, versoes, classe, aoAbrir }: Props) {
  const { t } = useLingui()
  const novaVersao = useNovaVersao()
  const publicar = usePublicarPlano()
  const [aConfirmar, setAConfirmar] = useState(false)
  const rascunho = versoes.find((v) => v.estado === 'RASCUNHO')
  const vigente = versoes.find((v) => v.estado === 'VIGENTE')
  const versao = plano.versao
  const versaoVigente = vigente?.versao

  if (plano.estado === 'VIGENTE' && !rascunho) {
    return (
      <Button
        aCarregar={novaVersao.isPending}
        onClick={() =>
          novaVersao.mutate(plano, {
            onSuccess: ({ plano: criado }) => {
              const n = criado.versao
              anunciar.educado(t`Versão ${n} criada como rascunho.`)
              aoAbrir(criado.id)
            },
            onError: (erro) => notificar.erro(mensagemDeErro(erro)),
          })
        }
      >
        <CopyPlus aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Criar nova versão</Trans>
      </Button>
    )
  }

  if (plano.estado !== 'RASCUNHO') return null

  return (
    <>
      <Button variante="primario" onClick={() => setAConfirmar(true)}>
        <Send aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Publicar versão {versao}</Trans>
      </Button>
      <Dialogo
        aberta={aConfirmar}
        aoMudar={setAConfirmar}
        pendente={publicar.isPending}
        titulo={t`Publicar a versão ${versao} do plano da ${classe}?`}
        descricao={
          versaoVigente
            ? t`A versão ${versao} passa a vigente e a versão ${versaoVigente} fica arquivada. Depois de publicada não se edita: para mudar, cria-se outra versão.`
            : t`A versão ${versao} passa a vigente. Depois de publicada não se edita: para mudar, cria-se outra versão.`
        }
        rodape={
          <>
            <Button onClick={() => setAConfirmar(false)} disabled={publicar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button
              variante="primario"
              aCarregar={publicar.isPending}
              onClick={() =>
                publicar.mutate(plano, {
                  onSuccess: (publicado) => {
                    setAConfirmar(false)
                    notificar.sucesso(t`Versão ${versao} publicada. É agora a vigente.`)
                    aoAbrir(publicado.id)
                  },
                  onError: (erro) => {
                    setAConfirmar(false)
                    notificar.erro(mensagemDeErro(erro))
                  },
                })
              }
            >
              <Trans>Publicar</Trans>
            </Button>
          </>
        }
      >
        {plano.linhas.length === 0 && (
          <Aviso tom="aviso">
            <Trans>O plano não tem disciplinas. Acrescente pelo menos uma antes de publicar.</Trans>
          </Aviso>
        )}
      </Dialogo>
    </>
  )
}
