import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { ResumoErros } from './resumo-erros'

const meta = {
  title: 'Sistema de desenho/Resumo de erros',
  component: ResumoErros,
  args: {
    erros: [
      { campo: 'nome', rotulo: 'Nome completo', mensagem: 'Escreva o nome completo.' },
      {
        campo: 'telefone',
        rotulo: 'Telefone',
        mensagem: 'O telefone tem 9 dígitos e começa por 9.',
      },
    ],
  },
} satisfies Meta<typeof ResumoErros>
export default meta
type Historia = StoryObj<typeof meta>

/** Ao submeter com erros: quantos faltam e uma ligação para cada campo (guia 7.2). */
export const ComErros: Historia = {
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    await expect(
      ecra.getByRole('alert', { name: 'Corrija 2 campos antes de continuar.' }),
    ).toBeVisible()
  },
}

export const UmErro: Historia = {
  args: {
    erros: [{ campo: 'classeId', rotulo: 'Classe', mensagem: 'Escolha a classe.' }],
  },
}
