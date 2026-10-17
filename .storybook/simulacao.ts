import { worker } from '../src/mocks/browser'
import { sessao } from '../src/shared/api'
import { usePermissoesStore } from '../src/shared/lib/permissoes'
import { UTILIZADORES } from '../src/mocks/db'

let arranque: Promise<unknown> | undefined

/**
 * Histórias de componentes com dados (quadro de tarefas, vistas guardadas, relatórios) usam a
 * mesma API simulada da aplicação, com sessão da secretaria. Arranca uma vez por página.
 */
export async function iniciarSimulacao() {
  arranque ??= worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  await arranque
  const secretaria = UTILIZADORES.find((u) => u.id === 'u1')!
  sessao.definirToken('tk-u1')
  usePermissoesStore.getState().definir(secretaria.permissoes)
}
