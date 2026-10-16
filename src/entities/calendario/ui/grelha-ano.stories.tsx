import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import type { Calendario } from '../model/tipos'
import { GrelhaAno, LegendaCalendario } from './grelha-ano'

const evento = (
  id: string,
  tipo: Calendario['eventos'][number]['tipo'],
  tipoRotulo: string,
  titulo: string,
  inicio: string,
  fim = inicio,
) => ({ id, tipo, tipoRotulo, titulo, inicio, fim, fixo: tipo === 'FERIADO' })

/** Ano de exemplo (dados fixos, sem rede). */
const calendario: Calendario = {
  anoLectivoId: 'exemplo',
  trimestres: [
    { numero: 1, rotulo: '1.º trimestre', inicio: '2026-09-01', fim: '2026-12-11' },
    { numero: 2, rotulo: '2.º trimestre', inicio: '2027-01-04', fim: '2027-04-02' },
    { numero: 3, rotulo: '3.º trimestre', inicio: '2027-04-12', fim: '2027-07-16' },
  ],
  eventos: [
    evento('1', 'DATA_CHAVE', 'Data-chave', 'Início das aulas', '2026-09-01'),
    evento('2', 'FERIADO', 'Feriado', 'Dia do Fundador da Nação e do Herói Nacional', '2026-09-17'),
    evento('3', 'EVENTO', 'Evento', 'Reunião geral de encarregados', '2026-10-10'),
    evento('4', 'FERIADO', 'Feriado', 'Dia da Independência Nacional', '2026-11-11'),
    evento(
      '5',
      'INTERRUPCAO',
      'Interrupção lectiva',
      'Férias do Natal',
      '2026-12-12',
      '2027-01-03',
    ),
    evento('6', 'FERIADO', 'Feriado', 'Dia de Natal e da Família', '2026-12-25'),
    evento(
      '7',
      'INTERRUPCAO',
      'Interrupção lectiva',
      'Interrupção da Páscoa',
      '2027-04-03',
      '2027-04-11',
    ),
    evento('8', 'DATA_CHAVE', 'Data-chave', 'Provas finais', '2027-07-05', '2027-07-16'),
  ],
}

const meta = {
  title: 'Entidades/Calendário do ano',
  component: GrelhaAno,
  args: { calendario, inicio: '2026-09-01', fim: '2027-07-31', aoEscolherDia: () => {} },
  render: (a) => <ComSeleccao {...a} />,
} satisfies Meta<typeof GrelhaAno>

/** Guarda o dia escolhido, como a rota faz com o URL. */
function ComSeleccao(props: Parameters<typeof GrelhaAno>[0]) {
  const [dia, setDia] = useState(props.seleccionado)
  return (
    <div className="flex flex-col gap-6">
      <LegendaCalendario calendario={props.calendario} />
      <GrelhaAno {...props} seleccionado={dia} aoEscolherDia={setDia} />
    </div>
  )
}
export default meta
type Historia = StoryObj<typeof meta>

export const AnoCompleto: Historia = {}

export const DiaSeleccionado: Historia = { args: { seleccionado: '2026-11-11' } }

/** Navegação por teclado: só um dia está na ordem do Tab; setas e PageDown movem o foco. */
export const Teclado: Historia = {
  args: { seleccionado: '2026-11-11' },
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    const dia = ecra.getByRole('button', { name: /^quarta-feira, 11 de novembro de 2026/ })
    dia.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(
      ecra.getByRole('button', { name: /^quinta-feira, 12 de novembro de 2026/ }),
    ).toHaveFocus()
    await userEvent.keyboard('{PageDown}')
    await expect(
      ecra.getByRole('button', { name: /^sábado, 12 de dezembro de 2026/ }),
    ).toHaveFocus()
  },
}
