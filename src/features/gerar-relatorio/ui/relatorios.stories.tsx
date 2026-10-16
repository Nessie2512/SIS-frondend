import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { CatalogoRelatorios } from './relatorios'

/** Catálogo servido pela API simulada, para o ano lectivo 2026/2027. */
const meta = {
  title: 'Funcionalidades/Catálogo de relatórios',
  component: CatalogoRelatorios,
  args: { anoLectivoId: 'ano-2026' },
} satisfies Meta<typeof CatalogoRelatorios>
export default meta
type Historia = StoryObj<typeof meta>

export const Catalogo: Historia = {
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    const lista = await ecra.findByRole('list', { name: 'Relatórios disponíveis' })
    await expect(within(lista).getAllByRole('listitem')).toHaveLength(6)
  },
}

/** A lista nominal precisa da turma: o erro aparece junto ao campo, sem pedir nada ao servidor. */
export const ParametroEmFalta: Historia = {
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    const cartao = await ecra.findByRole('article', { name: 'Lista nominal da turma' })
    await userEvent.click(
      within(cartao).getByRole('button', { name: 'Gerar: Lista nominal da turma' }),
    )
    await expect(await within(cartao).findByText('Escolha a turma.')).toBeVisible()
  },
}

export const Escuro: Historia = { ...ParametroEmFalta, globals: { tema: 'escuro' } }
