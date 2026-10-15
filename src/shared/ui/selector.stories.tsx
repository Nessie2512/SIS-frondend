import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Campo } from './campo'
import { Selector, type OpcaoSelector } from './selector'

const classes: OpcaoSelector[] = [
  { valor: 'c7', rotulo: '7.ª classe', descricao: 'I ciclo do ensino secundário' },
  { valor: 'c8', rotulo: '8.ª classe', descricao: 'I ciclo do ensino secundário' },
  { valor: 'c9', rotulo: '9.ª classe', descricao: 'I ciclo do ensino secundário' },
  { valor: 'c10', rotulo: '10.ª classe', descricao: 'II ciclo do ensino secundário' },
  { valor: 'c11', rotulo: '11.ª classe', desactivada: true },
]

const meta = { title: 'Sistema de desenho/Selector', component: Selector } satisfies Meta<
  typeof Selector
>
export default meta
type Historia = StoryObj<typeof meta>

function Simples(props: { erro?: string; desactivado?: boolean }) {
  const [valor, setValor] = useState<string | null>(null)
  return (
    <Campo rotulo="Classe" erro={props.erro} className="max-w-xs">
      {(c) => (
        <Selector
          {...c}
          opcoes={classes}
          valor={valor}
          aoMudar={setValor}
          desactivado={props.desactivado}
        />
      )}
    </Campo>
  )
}

export const Simples_: Historia = {
  name: 'Simples',
  args: { opcoes: [], valor: null, aoMudar: () => {} },
  render: () => <Simples />,
}
export const ComErro: Historia = {
  args: { opcoes: [], valor: null, aoMudar: () => {} },
  render: () => <Simples erro="Escolha a classe." />,
}
export const Desactivado: Historia = {
  args: { opcoes: [], valor: null, aoMudar: () => {} },
  render: () => <Simples desactivado />,
}

export const Multiplo: Historia = {
  args: { opcoes: [], valor: null, aoMudar: () => {} },
  render: function Render() {
    const [valor, setValor] = useState<string[]>(['c7', 'c8'])
    return (
      <Campo rotulo="Classes" className="max-w-xs">
        {(c) => <Selector {...c} multiplo opcoes={classes} valor={valor} aoMudar={setValor} />}
      </Campo>
    )
  },
}

export const Assincrono: Historia = {
  args: { opcoes: [], valor: null, aoMudar: () => {} },
  render: function Render() {
    const [valor, setValor] = useState<string | null>(null)
    const [opcoes, setOpcoes] = useState<OpcaoSelector[]>([])
    const [aCarregar, setACarregar] = useState(false)
    return (
      <Campo
        rotulo="Professor"
        descricao="Só aparecem professores activos e habilitados."
        className="max-w-xs"
      >
        {(c) => (
          <Selector
            {...c}
            opcoes={opcoes}
            valor={valor}
            aoMudar={setValor}
            aCarregar={aCarregar}
            aoPesquisar={(texto) => {
              setACarregar(true)
              setTimeout(() => {
                setOpcoes(texto ? [{ valor: 'p1', rotulo: `João ${texto}` }] : [])
                setACarregar(false)
              }, 600)
            }}
          />
        )}
      </Campo>
    )
  },
}
