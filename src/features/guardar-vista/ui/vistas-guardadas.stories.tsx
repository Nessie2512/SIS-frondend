import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { VistasGuardadas } from './vistas-guardadas'

/** As vistas vêm da API simulada: a secretaria tem «7.ª classe sem turma» nas matrículas. */
const meta = {
  title: 'Funcionalidades/Vistas guardadas',
  component: VistasGuardadas,
  args: { ecra: 'matriculas', pesquisa: {}, aoAplicar: fn() },
} satisfies Meta<typeof VistasGuardadas>
export default meta
type Historia = StoryObj<typeof meta>

export const SemFiltros: Historia = {
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    await expect(await ecra.findByRole('button', { name: '7.ª classe sem turma' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(ecra.queryByRole('button', { name: 'Guardar vista' })).toBeNull()
  },
}

/** Os filtros actuais são os de uma vista: fica assinalada e não se oferece guardar outra igual. */
export const VistaActiva: Historia = {
  args: { pesquisa: { classeId: 'c7', semTurma: true, page: 2 } },
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    await expect(await ecra.findByRole('button', { name: '7.ª classe sem turma' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(ecra.queryByRole('button', { name: 'Guardar vista' })).toBeNull()
  },
}

/** Filtros que ainda não estão numa vista: aparece «Guardar vista». */
export const FiltrosPorGuardar: Historia = {
  args: { pesquisa: { estado: 'PENDENTE' } },
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    await expect(await ecra.findByRole('button', { name: 'Guardar vista' })).toBeVisible()
  },
}

export const Escuro: Historia = { ...VistaActiva, globals: { tema: 'escuro' } }
