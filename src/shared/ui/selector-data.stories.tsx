import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SelectorData, SelectorPeriodo } from './selector-data'

const meta = {
  title: 'Sistema de desenho/Selector de data',
  component: SelectorData,
} satisfies Meta<typeof SelectorData>
export default meta
type Historia = StoryObj<typeof meta>

const ano = { minimo: '2026-09-01', maximo: '2027-07-31' }

export const Dia: Historia = {
  args: { rotulo: 'Data de início', valor: null, aoMudar: () => {}, ...ano },
  render: function Render(a) {
    const [valor, setValor] = useState<string | null>('2026-10-15')
    return (
      <div className="max-w-xs">
        <SelectorData {...a} valor={valor} aoMudar={setValor} />
        <p className="mt-2 text-secundario text-texto-3">Valor: {valor ?? '—'}</p>
      </div>
    )
  },
}

export const ForaDoAnoLectivo: Historia = {
  args: {
    rotulo: 'Data do evento',
    valor: null,
    aoMudar: () => {},
    ...ano,
    erro: 'A data está fora do ano lectivo (01/09/2026 a 31/07/2027).',
  },
  render: (a) => (
    <div className="max-w-xs">
      <SelectorData {...a} />
    </div>
  ),
}

export const Desactivado: Historia = {
  args: { rotulo: 'Data de nascimento', valor: '2012-04-03', aoMudar: () => {}, desactivado: true },
  render: (a) => (
    <div className="max-w-xs">
      <SelectorData {...a} />
    </div>
  ),
}

export const Periodo: Historia = {
  args: { rotulo: 'Período', valor: null, aoMudar: () => {} },
  render: function Render() {
    const [valor, setValor] = useState<{ inicio: string | null; fim: string | null }>({
      inicio: '2026-10-05',
      fim: '2026-10-16',
    })
    return (
      <div className="max-w-xs">
        <SelectorPeriodo
          rotulo="1.º trimestre: interrupção"
          valor={valor}
          aoMudar={setValor}
          {...ano}
        />
      </div>
    )
  },
}
