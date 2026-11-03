import { Trans, useLingui } from '@lingui/react/macro'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Campo, Dialogo, Entrada, notificar } from '@/shared/ui'
import { useAlterarPalavraPasse } from '../model/use-alterar-palavra-passe'

const MINIMO = 12
const MAXIMO = 128

/** Alterar a palavra-passe da própria conta, em diálogo (guia 7.3). */
export function AlterarPalavraPasse({ utilizadorId }: { utilizadorId: string }) {
  const { t } = useLingui()
  const alterar = useAlterarPalavraPasse(utilizadorId)
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erros, setErros] = useState<{ nova?: string; repetida?: string }>({})
  const [erroGeral, setErroGeral] = useState<string>()

  function fechar() {
    setAberto(false)
    setNova('')
    setRepetida('')
    setErros({})
    setErroGeral(undefined)
  }

  function gravar() {
    const locais: typeof erros = {}
    if (nova.length < MINIMO || nova.length > MAXIMO)
      locais.nova = t`A palavra-passe tem de 12 a 128 caracteres.`
    if (repetida !== nova) locais.repetida = t`As duas palavras-passe não são iguais.`
    setErros(locais)
    setErroGeral(undefined)
    if (locais.nova || locais.repetida) return
    alterar.mutate(nova, {
      onSuccess: () => {
        const mensagem = t`Palavra-passe alterada. Use-a da próxima vez que entrar.`
        notificar.sucesso(mensagem)
        anunciar.educado(mensagem)
        fechar()
      },
      onError: (e) => {
        const deCampo = eApiError(e) ? e.errors.find((x) => x.campo === 'password') : undefined
        if (deCampo) setErros({ nova: deCampo.mensagem })
        else setErroGeral(mensagemDeErro(e))
      },
    })
  }

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <KeyRound aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Alterar palavra-passe</Trans>
      </Button>
      <Dialogo
        pendente={alterar.isPending}
        aberta={aberto}
        aoMudar={(v) => (v ? setAberto(true) : fechar())}
        titulo={t`Alterar palavra-passe`}
        descricao={t`De 12 a 128 caracteres. A sessão actual continua aberta.`}
        rodape={
          <>
            <Button onClick={fechar} disabled={alterar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={alterar.isPending} onClick={gravar}>
              <Trans>Guardar</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
          <Campo rotulo={t`Nova palavra-passe`} erro={erros.nova} obrigatorio>
            {(c) => (
              <Entrada
                {...c}
                type="password"
                autoComplete="new-password"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo={t`Repita a palavra-passe`} erro={erros.repetida} obrigatorio>
            {(c) => (
              <Entrada
                {...c}
                type="password"
                autoComplete="new-password"
                value={repetida}
                onChange={(e) => setRepetida(e.target.value)}
              />
            )}
          </Campo>
        </div>
      </Dialogo>
    </>
  )
}
