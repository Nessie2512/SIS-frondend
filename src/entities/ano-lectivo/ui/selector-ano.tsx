import { Trans } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { anosLectivosQuery } from '../api/queries'
import { useContextoAno } from '../model/contexto'

/**
 * Selector do ano lectivo (guia 6.3): cápsula no cabeçalho com o ano em contexto e o seu estado.
 * Mudar de ano mantém a rota e recarrega os dados.
 * Provisório: <select> nativo até haver o componente Selector do sistema de desenho.
 */
export function SelectorAno() {
  const router = useRouter()
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const anoLectivoId = useContextoAno((e) => e.anoLectivoId)
  const escolher = useContextoAno((e) => e.escolher)
  const actual = anos.find((a) => a.id === anoLectivoId)

  return (
    <label className="flex items-center gap-2 rounded-full bg-fundo px-3 py-1 text-secundario ring-1 ring-linha">
      <span className="sr-only">
        <Trans>Ano lectivo</Trans>
      </span>
      <select
        className="bg-transparent font-medium text-texto-1 outline-none"
        value={anoLectivoId ?? ''}
        onChange={(e) => {
          escolher(e.target.value)
          void router.invalidate()
        }}
      >
        {anos.map((ano) => (
          <option key={ano.id} value={ano.id}>
            {ano.designacao}
          </option>
        ))}
      </select>
      {actual && <span className="text-legenda text-texto-3">{actual.estadoRotulo}</span>}
    </label>
  )
}
