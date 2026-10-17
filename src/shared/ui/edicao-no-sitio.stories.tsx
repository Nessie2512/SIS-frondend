import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { EdicaoNoSitio } from './edicao-no-sitio'

const meta = {
  title: 'Sistema de desenho/Edição no sítio',
  component: EdicaoNoSitio,
  args: {
    rotulo: 'Telefone',
    valor: '923456789',
    mostrar: (v) => v?.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') ?? null,
    aoGuardar: () => new Promise((resolver) => setTimeout(resolver, 400)),
  },
} satisfies Meta<typeof EdicaoNoSitio>
export default meta
type Historia = StoryObj<typeof meta>

export const Repouso: Historia = {}

export const SemValor: Historia = { args: { rotulo: 'Morada', valor: null, mostrar: undefined } }

/** Desactivado com a razão numa dica; continua focável pelo teclado (guia 2.7). */
export const Desactivado: Historia = {
  args: { desactivadoPorque: 'O ano lectivo está encerrado.' },
}

/** Validação local: a mensagem aparece junto do campo e o que foi escrito fica. */
export const ComErroDeValidacao: Historia = {
  args: {
    validar: (v) =>
      /^9\d{8}$/.test(v.replace(/\s/g, ''))
        ? undefined
        : 'O telefone tem 9 dígitos e começa por 9.',
  },
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    await userEvent.click(ecra.getByRole('button', { name: /^Editar Telefone:/ }))
    const campo = ecra.getByLabelText('Telefone')
    await userEvent.clear(campo)
    await userEvent.type(campo, '123{Enter}')
    await expect(await ecra.findByText('O telefone tem 9 dígitos e começa por 9.')).toBeVisible()
    await expect(campo).toHaveValue('123')
  },
}

/** O servidor recusa: volta a abrir com o que foi escrito e diz porquê (guia 5.5). */
export const RecusadoPeloServidor: Historia = {
  args: {
    aoGuardar: () =>
      new Promise((_, rejeitar) =>
        setTimeout(
          () => rejeitar(new Error('Não foi possível guardar. A sua alteração continua aqui.')),
          300,
        ),
      ),
  },
  play: async ({ canvasElement }) => {
    const ecra = within(canvasElement)
    await userEvent.click(ecra.getByRole('button', { name: /^Editar Telefone:/ }))
    const campo = ecra.getByLabelText('Telefone')
    await userEvent.clear(campo)
    await userEvent.type(campo, '912000111{Enter}')
    await expect(
      await ecra.findByText('Não foi possível guardar. A sua alteração continua aqui.'),
    ).toBeVisible()
  },
}

/** Lista de campos como numa ficha: as etiquetas alinham numa coluna de 13rem. */
export const NumaFicha: Historia = {
  render: (a) => (
    <div className="max-w-2xl divide-y divide-linha">
      <EdicaoNoSitio
        {...a}
        rotulo="Nome completo"
        valor="Maria Quintas Santos"
        mostrar={undefined}
      />
      <EdicaoNoSitio {...a} />
      <EdicaoNoSitio {...a} rotulo="Morada" valor={null} mostrar={undefined} />
    </div>
  ),
}
