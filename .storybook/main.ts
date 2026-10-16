import type { StorybookConfig } from '@storybook/react-vite'

/** Catálogo de componentes (guia 3.2, 6.2): cada estado de cada componente à vista, em claro e escuro. */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
}

export default config
