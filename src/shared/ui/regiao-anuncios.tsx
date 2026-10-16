import { useAnuncios } from '@/shared/lib/anunciar'

/** Regiões aria-live da aplicação; montar uma vez na raiz (guia 8.1). */
export function RegiaoAnuncios() {
  const { educado, assertivo } = useAnuncios()
  return (
    <div className="sr-only">
      <div role="status" aria-live="polite" aria-atomic="true">
        {educado}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true">
        {assertivo}
      </div>
    </div>
  )
}
