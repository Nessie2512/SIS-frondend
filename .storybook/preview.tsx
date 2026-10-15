import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { Providers } from '../src/app/providers'
import { criarQueryClient } from '../src/app/query-client'
import '../src/shared/styles/tokens.css'

const queryClient = criarQueryClient()

/** Tema e densidade escolhidos na barra do Storybook, aplicados como na aplicação. */
function AplicarTema({
  tema,
  densidade,
  children,
}: {
  tema: string
  densidade: string
  children: ReactNode
}) {
  useEffect(() => {
    document.documentElement.dataset.tema = tema
    document.documentElement.dataset.densidade = densidade
  }, [tema, densidade])
  return <div className="min-h-dvh bg-fundo p-6 text-corpo text-texto-1">{children}</div>
}

const comTema: Decorator = (Story, contexto) => {
  const { tema, densidade } = contexto.globals as { tema: string; densidade: string }
  return (
    <AplicarTema tema={tema} densidade={densidade}>
      <Story />
    </AplicarTema>
  )
}

const comProviders: Decorator = (Story) => (
  <Providers queryClient={queryClient}>
    <Story />
    <Toaster position="bottom-right" closeButton />
  </Providers>
)

const preview: Preview = {
  decorators: [comTema, comProviders],
  globalTypes: {
    tema: {
      description: 'Tema',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'claro', title: 'Claro' },
          { value: 'escuro', title: 'Escuro' },
        ],
        dynamicTitle: true,
      },
    },
    densidade: {
      description: 'Densidade',
      toolbar: {
        icon: 'component',
        items: [
          { value: 'confortavel', title: 'Confortável' },
          { value: 'compacta', title: 'Compacta' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { tema: 'claro', densidade: 'confortavel' },
  parameters: {
    layout: 'fullscreen',
    // Violações de acessibilidade falham os testes das histórias (guia 3.2, 6.4 ponto 8)
    a11y: { test: 'error' },
    controls: { expanded: true },
  },
}

export default preview
