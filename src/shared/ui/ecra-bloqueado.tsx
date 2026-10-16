import { Trans, useLingui } from '@lingui/react/macro'
import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from './button'
import { Campo, Entrada } from './campo'

interface Props {
  nome: string
  /** Verifica a palavra-passe; devolve uma mensagem de erro ou nada se desbloqueou */
  aoDesbloquear: (palavraPasse: string) => Promise<string | void>
  aoSair: () => void
}

/**
 * Bloqueio de ecrã por inactividade (guia 4.4): esconde o conteúdo sem perder o que estava a
 * ser escrito; pede de novo a palavra-passe. A verificação fica do lado da API.
 */
export function EcraBloqueado({ nome, aoDesbloquear, aoSair }: Props) {
  const { t } = useLingui()
  const [palavraPasse, setPalavraPasse] = useState('')
  const [erro, setErro] = useState<string>()
  const [aVerificar, setAVerificar] = useState(false)

  async function submeter(e: FormEvent) {
    e.preventDefault()
    setAVerificar(true)
    const problema = await aoDesbloquear(palavraPasse)
    setAVerificar(false)
    if (problema) setErro(problema)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bloqueio-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-fundo/80 p-4 backdrop-blur-2xl"
    >
      <form
        onSubmit={submeter}
        className="flex w-full max-w-sm flex-col gap-5 rounded-folha bg-superficie p-6 shadow-flutuante ring-1 ring-linha"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Lock aria-hidden className="size-6 stroke-[1.5] text-texto-3" />
          <h2 id="bloqueio-titulo" className="text-titulo-seccao">
            <Trans>Sessão bloqueada</Trans>
          </h2>
          <p className="text-secundario text-texto-2">
            <Trans>Por inactividade. O que estava a fazer continua guardado, {nome}.</Trans>
          </p>
        </div>
        <Campo rotulo={t`Palavra-passe`} erro={erro}>
          {(c) => (
            <Entrada
              {...c}
              type="password"
              autoComplete="current-password"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- o bloqueio só tem esta acção
              autoFocus
              value={palavraPasse}
              onChange={(e) => setPalavraPasse(e.target.value)}
            />
          )}
        </Campo>
        <div className="flex flex-col gap-2">
          <Button type="submit" variante="primario" aCarregar={aVerificar} disabled={!palavraPasse}>
            <Trans>Desbloquear</Trans>
          </Button>
          <Button type="button" variante="discreto" onClick={aoSair}>
            <Trans>Entrar com outra conta</Trans>
          </Button>
        </div>
      </form>
    </div>
  )
}
