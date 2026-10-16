import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { useState } from 'react'
import { expect, within } from 'storybook/test'
import { usePreferencias } from '@/shared/lib/preferencias'
import { MenuLateral } from './menu-lateral'

/** O menu usa ligações do router: cada história monta um router em memória no endereço dado. */
const comRouter =
  (endereco: string): Decorator =>
  (Story) => {
    const [router] = useState(() =>
      createRouter({
        routeTree: createRootRoute({
          component: () => (
            <div className="flex">
              <Story />
            </div>
          ),
        }),
        history: createMemoryHistory({ initialEntries: [endereco] }),
      }),
    )
    return <RouterProvider router={router} />
  }

const meta = {
  title: 'Casca/Menu lateral',
  component: MenuLateral,
  decorators: [comRouter('/turmas')],
} satisfies Meta<typeof MenuLateral>
export default meta
type Historia = StoryObj<typeof meta>

/** Ícone e nome; a secção actual (Turmas) fica assinalada. */
export const Expandido: Historia = {
  loaders: [
    () => {
      usePreferencias.setState({ menuRecolhido: false })
    },
  ],
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement)
    await expect(await menu.findByRole('link', { name: 'Turmas' })).toHaveAttribute(
      'data-status',
      'active',
    )
    await expect(menu.getByRole('button', { name: 'Recolher o menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  },
}

/** Só ícones; o nome fica para leitores de ecrã e aparece numa dica. */
export const Recolhido: Historia = {
  loaders: [
    () => {
      usePreferencias.setState({ menuRecolhido: true })
    },
  ],
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement)
    await expect(await menu.findByRole('link', { name: 'Calendário' })).toBeInTheDocument()
    await expect(menu.getByRole('button', { name: 'Expandir o menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  },
}

export const Escuro: Historia = { ...Expandido, globals: { tema: 'escuro' } }
