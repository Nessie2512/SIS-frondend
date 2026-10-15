import type { Meta, StoryObj } from '@storybook/react-vite'
import { EcraBloqueado } from './ecra-bloqueado'

const meta = {
  title: 'Casca/Ecrã bloqueado',
  component: EcraBloqueado,
  args: {
    nome: 'Maria',
    aoSair: () => {},
    aoDesbloquear: async (senha: string) =>
      new Promise<string | void>((r) =>
        setTimeout(
          () => r(senha === 'certa' ? undefined : 'A palavra-passe não está correcta.'),
          500,
        ),
      ),
  },
} satisfies Meta<typeof EcraBloqueado>
export default meta

export const Bloqueado: StoryObj<typeof meta> = {}
