import { Trans, useLingui } from '@lingui/react/macro'
import { Check, Pencil } from 'lucide-react'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/shared/lib/cn'
import { Dica } from './dica'
import { IndicadorPontual } from './progresso'

interface Props {
  rotulo: string
  valor: string | null
  /** Guarda o novo valor; rejeita com a mensagem a mostrar junto do campo */
  aoGuardar: (novo: string) => Promise<void>
  /** Texto a mostrar em leitura (ex.: telefone formatado) */
  mostrar?: (valor: string | null) => string | null
  validar?: (valor: string) => string | undefined
  /** Desactivado agora, com a razão (guia 2.7) */
  desactivadoPorque?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric'
  autoComplete?: string
  /** Marca este campo como o que a tecla E edita no ecrã (guia 7.5) */
  atalhoEditar?: boolean
}

/**
 * Edição no sítio (guia 7.2): o campo vira editável ao clicar, guarda ao sair (ou Enter),
 * Esc cancela, e confirma com um visto discreto. Em fichas, nunca um formulário à parte.
 */
export function EdicaoNoSitio({
  rotulo,
  valor,
  aoGuardar,
  mostrar,
  validar,
  desactivadoPorque,
  inputMode,
  autoComplete,
  atalhoEditar,
}: Props) {
  const { t } = useLingui()
  const id = useId()
  const [aEditar, setAEditar] = useState(false)
  const [rascunho, setRascunho] = useState(valor ?? '')
  const [erro, setErro] = useState<string>()
  const [estado, setEstado] = useState<'repouso' | 'a-guardar' | 'guardado'>('repouso')
  const botao = useRef<HTMLButtonElement>(null)
  const texto = (mostrar ? mostrar(valor) : valor) || null
  // O nome acessível contém o texto visível (WCAG 2.5.3): quem usa voz diz o que vê
  const visivel = texto ?? t`Acrescentar`

  function abrir() {
    setRascunho(valor ?? '')
    setErro(undefined)
    setAEditar(true)
  }

  function fechar() {
    setAEditar(false)
    requestAnimationFrame(() => botao.current?.focus())
  }

  async function guardar() {
    const novo = rascunho.trim()
    if (novo === (valor ?? '')) return fechar()
    const problema = validar?.(novo)
    if (problema) return setErro(problema)
    setEstado('a-guardar')
    fechar()
    try {
      await aoGuardar(novo)
      setEstado('guardado')
      setTimeout(() => setEstado('repouso'), 1500)
    } catch (motivo) {
      // Volta a abrir com o que o utilizador escreveu e diz porquê (guia 5.5)
      setEstado('repouso')
      setRascunho(novo)
      setErro(motivo instanceof Error ? motivo.message : String(motivo))
      setAEditar(true)
    }
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void guardar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      fechar()
    }
  }

  return (
    <div className="grid grid-cols-[13rem_1fr] items-start gap-x-6 py-2">
      <label htmlFor={id} className="flex min-h-9 items-center text-texto-2">
        {rotulo}
      </label>
      {aEditar ? (
        <div className="flex flex-col gap-1">
          <input
            id={id}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- o utilizador acabou de pedir para editar
            autoFocus
            value={rascunho}
            inputMode={inputMode}
            autoComplete={autoComplete}
            onChange={(e) => setRascunho(e.target.value)}
            onBlur={() => void guardar()}
            onKeyDown={aoTeclar}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? `${id}-erro` : undefined}
            className="h-9 w-full max-w-sm rounded-controlo bg-superficie px-3 text-corpo ring-2 ring-acento outline-none aria-invalid:ring-perigo"
          />
          {erro && (
            <p id={`${id}-erro`} className="text-secundario text-perigo">
              {erro}
            </p>
          )}
        </div>
      ) : (
        <div className="flex min-h-9 items-center gap-2">
          {desactivadoPorque ? (
            <Dica texto={desactivadoPorque}>
              {/* Botão desactivado com a razão na dica: continua focável pelo teclado (guia 2.7) */}
              <button
                id={id}
                type="button"
                aria-disabled="true"
                className="-mx-2 cursor-default rounded-controlo px-2 py-1.5 text-left"
              >
                {texto ?? <span className="text-texto-3">—</span>}
              </button>
            </Dica>
          ) : (
            <button
              ref={botao}
              id={id}
              type="button"
              onClick={abrir}
              data-atalho={atalhoEditar ? 'editar' : undefined}
              aria-label={t`Editar ${rotulo}: ${visivel}`}
              className={cn(
                'group -mx-2 flex items-center gap-2 rounded-controlo px-2 py-1.5 text-left hover:bg-fundo',
                !texto && 'text-texto-3',
              )}
            >
              <span>{texto ?? <Trans>Acrescentar</Trans>}</span>
              <Pencil
                aria-hidden
                className="size-3.5 stroke-[1.5] text-texto-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </button>
          )}
          {estado === 'a-guardar' && <IndicadorPontual rotulo={t`A guardar`} />}
          {estado === 'guardado' && (
            <span role="status" className="flex items-center text-sucesso">
              <Check aria-hidden className="size-4 stroke-[1.5]" />
              <span className="sr-only">
                <Trans>Guardado</Trans>
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
