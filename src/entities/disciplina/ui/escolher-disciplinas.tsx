import { Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { disciplinasQuery } from '../api/queries'

interface Props {
  legenda: string
  /** uuids das disciplinas escolhidas */
  valor: readonly string[]
  aoMudar: (valor: string[]) => void
  erro?: string
  obrigatorio?: boolean
}

/** Várias disciplinas activas, por caixas de escolha (ex.: as que um professor pode leccionar). */
export function EscolherDisciplinas({ legenda, valor, aoMudar, erro, obrigatorio }: Props) {
  const id = useId()
  const { data: disciplinas = [] } = useQuery(disciplinasQuery())
  const activas = disciplinas.filter((d) => d.activa)
  const alternar = (uuid: string, marcada: boolean) =>
    aoMudar(marcada ? [...valor, uuid] : valor.filter((x) => x !== uuid))

  return (
    <fieldset
      aria-describedby={erro ? `${id}-erro` : undefined}
      aria-invalid={erro ? true : undefined}
      className="flex flex-col gap-2"
    >
      <legend className="mb-1 text-legenda text-texto-2">
        {legenda}
        {obrigatorio && (
          <span aria-hidden className="text-perigo">
            {' '}
            *
          </span>
        )}
      </legend>
      {activas.length === 0 ? (
        <p className="text-secundario text-texto-3">
          <Trans>Ainda não há disciplinas activas.</Trans>
        </p>
      ) : (
        <ul
          className={cn(
            'grid grid-cols-1 gap-x-4 gap-y-1 rounded-cartao bg-superficie p-3 ring-1 sm:grid-cols-2',
            erro ? 'ring-perigo' : 'ring-linha',
          )}
        >
          {activas.map((d) => {
            const caixa = `${id}-${d.id}`
            return (
              <li key={d.id} className="flex items-center gap-2">
                <input
                  id={caixa}
                  type="checkbox"
                  checked={valor.includes(d.id)}
                  onChange={(e) => alternar(d.id, e.target.checked)}
                  className="size-4 accent-(--color-acento)"
                />
                <label htmlFor={caixa} className="cursor-pointer">
                  {d.nome}
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {erro && (
        <span id={`${id}-erro`} className="text-secundario text-perigo">
          {erro}
        </span>
      )}
    </fieldset>
  )
}
