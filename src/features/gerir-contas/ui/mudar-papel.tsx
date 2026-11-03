import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { rotuloPapel, type Conta } from '@/entities/administracao'
import { ePapel, PAPEIS_DE_CONTA, type Papel } from '@/shared/config/papeis'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Campo, Dialogo, notificar, Selector } from '@/shared/ui'
import { useMudarPapel } from '../model/use-contas'

/** Perfil da conta com botão para o mudar (backend SIS: PATCH /users/{uuid}). */
export function MudarPapel({ conta }: { conta: Conta }) {
  const { t } = useLingui()
  const mudar = useMudarPapel()
  const [aberta, setAberta] = useState(false)
  const [papel, setPapel] = useState<Papel | null>(ePapel(conta.perfilId) ? conta.perfilId : null)
  const [erro, setErro] = useState<string>()
  const nome = conta.nome

  function gravar() {
    if (!papel) return setErro(t`Escolha o perfil.`)
    mudar.mutate(
      { utilizadorId: conta.id, papel },
      {
        onSuccess: () => {
          const perfil = rotuloPapel(papel)
          notificar.sucesso(t`${nome} passa a ${perfil}.`)
          anunciar.educado(t`${nome} passa a ${perfil}.`)
          setAberta(false)
        },
        onError: (e) => setErro(mensagemDeErro(e)),
      },
    )
  }

  return (
    <span className="flex items-center gap-2">
      {conta.perfil}
      <Button
        variante="discreto"
        tamanho="compacto"
        aria-label={t`Mudar o perfil de ${nome}`}
        onClick={() => {
          setErro(undefined)
          setAberta(true)
        }}
      >
        <Trans>Mudar</Trans>
      </Button>
      <Dialogo
        aberta={aberta}
        aoMudar={setAberta}
        titulo={t`Mudar o perfil de ${nome}`}
        descricao={t`As permissões mudam na próxima vez que a pessoa entrar.`}
        rodape={
          <>
            <Button onClick={() => setAberta(false)} disabled={mudar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={mudar.isPending} onClick={gravar}>
              <Trans>Guardar</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          <Campo rotulo={t`Perfil`} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={PAPEIS_DE_CONTA.map((p) => ({ valor: p, rotulo: rotuloPapel(p) }))}
                valor={papel}
                aoMudar={(v) => setPapel(v as Papel | null)}
              />
            )}
          </Campo>
        </div>
      </Dialogo>
    </span>
  )
}
