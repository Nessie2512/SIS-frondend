import { plural } from '@lingui/core/macro'
import { CircleAlert } from 'lucide-react'
import { useId } from 'react'
import type { ErroResumo } from '@/shared/lib/erros-formulario'

/**
 * Resumo de erros no topo do formulário ao submeter (guia 7.2, 8.1): diz quantos campos faltam
 * corrigir e leva a cada um. O foco continua a ir para o primeiro campo com erro; o resumo é
 * anunciado de forma assertiva e encolhe à medida que se corrige.
 */
export function ResumoErros({
  erros,
  aoEscolher,
}: {
  erros: ErroResumo[]
  /** Leva ao campo (ex.: setFocus do React Hook Form); sem efeito, procura-o pelo erro */
  aoEscolher?: (campo: string) => void
}) {
  const id = useId()
  const n = erros.length
  if (n === 0) return null
  return (
    <div
      role="alert"
      aria-labelledby={`${id}-titulo`}
      className="flex gap-3 rounded-cartao bg-superficie p-4 ring-2 ring-perigo"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-perigo" />
      <div className="flex min-w-0 flex-col gap-2">
        <p id={`${id}-titulo`} className="font-semibold">
          {plural(n, {
            one: 'Corrija # campo antes de continuar.',
            other: 'Corrija # campos antes de continuar.',
          })}
        </p>
        <ul className="flex flex-col gap-1">
          {erros.map((e) => (
            <li key={e.campo}>
              <button
                type="button"
                onClick={(evento) => {
                  const antes = document.activeElement
                  aoEscolher?.(e.campo)
                  if (document.activeElement === antes) focarPeloErro(evento.currentTarget, e)
                }}
                className="text-left text-perigo underline-offset-2 hover:underline"
              >
                <span className="font-medium">{e.rotulo}</span>: {e.mensagem}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Campos sem ref (selectores, campos fora do React Hook Form): o controlo com aria-invalid cujo
 * texto de erro ligado por aria-describedby é esta mensagem, dentro do mesmo formulário.
 */
function focarPeloErro(origem: HTMLElement, erro: ErroResumo) {
  const raiz = origem.closest('form') ?? origem.closest('[role="dialog"]') ?? document.body
  for (const controlo of raiz.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
    const ids = controlo.getAttribute('aria-describedby')?.split(' ') ?? []
    if (ids.some((id) => document.getElementById(id)?.textContent?.includes(erro.mensagem))) {
      controlo.focus()
      return
    }
  }
}
