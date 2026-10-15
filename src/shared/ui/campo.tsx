import { CircleAlert } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface PropsControlo {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
}

interface PropsCampo {
  rotulo: string
  descricao?: string
  erro?: string
  obrigatorio?: boolean
  className?: string
  /** Recebe os atributos que ligam o controlo à etiqueta, à descrição e ao erro. */
  children: (controlo: PropsControlo) => ReactNode
}

/**
 * Campo de formulário (guia 7.2, 8.1): etiqueta por cima, mensagem por baixo, erro ligado
 * por aria-describedby. A etiqueta nunca é substituída pelo placeholder.
 */
export function Campo({ rotulo, descricao, erro, obrigatorio, className, children }: PropsCampo) {
  const id = useId()
  const idDescricao = descricao ? `${id}-descricao` : undefined
  const idErro = erro ? `${id}-erro` : undefined
  const descritores = [idErro, idDescricao].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-legenda text-texto-2">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden className="ml-0.5 text-perigo">
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-describedby': descritores,
        'aria-invalid': erro ? true : undefined,
        'aria-required': obrigatorio ? true : undefined,
      })}
      {erro ? (
        <p id={idErro} className="flex items-center gap-1 text-secundario text-perigo">
          <CircleAlert aria-hidden className="size-3.5 shrink-0 stroke-[1.5]" />
          {erro}
        </p>
      ) : (
        descricao && (
          <p id={idDescricao} className="text-secundario text-texto-3">
            {descricao}
          </p>
        )
      )}
    </div>
  )
}

const classesControlo = cn(
  'w-full rounded-controlo bg-superficie text-corpo text-texto-1 ring-1 ring-contorno ring-inset',
  'placeholder:text-texto-3 transition-shadow duration-(--duracao-micro)',
  'focus-visible:ring-2 focus-visible:ring-acento focus-visible:outline-none',
  'aria-invalid:ring-2 aria-invalid:ring-perigo',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'read-only:bg-fundo read-only:ring-linha',
)

type PropsEntrada = ComponentProps<'input'> & {
  prefixo?: ReactNode
  sufixo?: ReactNode
}

/** Campo de texto: normal, com prefixo ou sufixo (guia 6.2). Máscaras nunca impedem escrever ou colar. */
export function Entrada({ className, prefixo, sufixo, ...props }: PropsEntrada) {
  if (!prefixo && !sufixo) {
    return <input className={cn(classesControlo, 'h-9 px-3', className)} {...props} />
  }
  return (
    <div className="relative flex items-center">
      {prefixo && (
        <span className="pointer-events-none absolute left-3 flex items-center text-texto-3 [&_svg]:size-4">
          {prefixo}
        </span>
      )}
      <input
        className={cn(classesControlo, 'h-9 px-3', prefixo && 'pl-9', sufixo && 'pr-9', className)}
        {...props}
      />
      {sufixo && (
        <span className="absolute right-3 flex items-center text-texto-3 [&_svg]:size-4">
          {sufixo}
        </span>
      )}
    </div>
  )
}

export function AreaTexto({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(classesControlo, 'min-h-20 px-3 py-2', className)} {...props} />
}
