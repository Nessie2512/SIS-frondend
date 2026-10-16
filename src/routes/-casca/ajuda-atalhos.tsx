import { Trans, useLingui } from '@lingui/react/macro'
import { mostrarAtalho } from '@/shared/lib/atalhos'
import { Dialogo } from '@/shared/ui'

/** Lista de atalhos (guia 7.5), aberta com "?". */
export function AjudaAtalhos({
  aberta,
  aoMudar,
}: {
  aberta: boolean
  aoMudar: (v: boolean) => void
}) {
  const { t } = useLingui()
  const atalhos: [string, string][] = [
    ['mod+k', t`Paleta de comandos: navegar, pesquisar, agir`],
    ['/', t`Foco na pesquisa da lista`],
    ['n', t`Novo (no contexto do ecrã)`],
    ['e', t`Editar o item em foco`],
    ['mod+enter', t`Guardar ou confirmar`],
    ['mod+z', t`Desfazer a última acção reversível`],
    ['Esc', t`Fechar folha, menu ou diálogo`],
    ['g i', t`Ir para Início`],
    ['g e', t`Ir para Estudantes`],
    ['g m', t`Ir para Matrículas`],
    ['g t', t`Ir para Turmas`],
    ['g p', t`Ir para Professores`],
    ['?', t`Mostrar todos os atalhos`],
  ]
  return (
    <Dialogo aberta={aberta} aoMudar={aoMudar} titulo={t`Atalhos de teclado`}>
      <table className="w-full text-left">
        <caption className="sr-only">
          <Trans>Atalhos de teclado</Trans>
        </caption>
        <tbody>
          {atalhos.map(([teclas, accao]) => (
            <tr key={teclas} className="border-b border-linha last:border-0">
              <th scope="row" className="w-28 py-2 pr-4 font-normal">
                <kbd className="tabular rounded-[6px] bg-fundo px-1.5 py-0.5 text-secundario ring-1 ring-linha">
                  {teclas === 'Esc' ? teclas : mostrarAtalho(teclas)}
                </kbd>
              </th>
              <td className="py-2 text-texto-2">{accao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialogo>
  )
}
