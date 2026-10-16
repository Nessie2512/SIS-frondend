import type { Meta, StoryObj } from '@storybook/react-vite'
import { CargaLectiva } from './carga-lectiva'

const carga = (cargaLectiva: number, cargaMaxima = 24) => ({
  cargaLectiva,
  cargaMaxima,
  ocupacao: Math.min(1, cargaLectiva / cargaMaxima),
})

const meta = {
  title: 'Entidades/Carga lectiva',
  component: CargaLectiva,
  args: { professor: carga(15) },
} satisfies Meta<typeof CargaLectiva>
export default meta
type Historia = StoryObj<typeof meta>

export const Parcial: Historia = {}
export const SemAtribuicoes: Historia = { args: { professor: carga(0) } }
/** No limite: a barra muda de cor e o texto diz o valor exacto. */
export const Completa: Historia = { args: { professor: carga(24) } }
