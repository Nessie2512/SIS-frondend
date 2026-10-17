import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { db, type Tarefa } from '@/mocks/db'
import { useTarefasAcompanhadas } from '../model/acompanhadas'
import { QuadroTarefas } from './quadro-tarefas'

const HORA = 3_600_000

/** Três tarefas, uma de cada estado, servidas pela API simulada. */
function semearTarefas() {
  const base = {
    tipo: 'LISTA_NOMINAL',
    parametros: { anoLectivoId: 'ano-2026' },
    utilizadorId: 'u1',
  } satisfies Partial<Tarefa>
  const tarefas: Tarefa[] = [
    // Uma hora de duração, começou há 18 minutos: fica nos 30% durante a história
    {
      ...base,
      id: 'h-curso',
      titulo: 'Lista nominal — 7.ª A',
      inicio: Date.now() - 0.3 * HORA,
      duracao: HORA,
      falha: false,
    },
    {
      ...base,
      id: 'h-pronta',
      titulo: 'Ocupação das turmas',
      inicio: Date.now() - HORA,
      duracao: 0,
      falha: false,
    },
    {
      ...base,
      id: 'h-falhou',
      titulo: 'Importação de estudantes',
      inicio: Date.now() - HORA,
      duracao: 0,
      falha: true,
    },
  ]
  db.tarefas = [...db.tarefas.filter((t) => !t.id.startsWith('h-')), ...tarefas]
  useTarefasAcompanhadas.setState({ ids: tarefas.map((t) => t.id) })
}

const meta = {
  title: 'Entidades/Quadro de tarefas',
  component: QuadroTarefas,
  loaders: [semearTarefas],
} satisfies Meta<typeof QuadroTarefas>
export default meta
type Historia = StoryObj<typeof meta>

/** Em curso com progresso, concluída com descarga e falhada com as linhas a corrigir. */
export const TresEstados: Historia = {
  play: async ({ canvasElement }) => {
    const quadro = within(canvasElement.ownerDocument.body)
    await expect(await quadro.findByRole('link', { name: 'Descarregar' })).toBeVisible()
    await expect(
      await quadro.findByText('Linha 12: Estudante sem número de processo.'),
    ).toBeVisible()
  },
}

/** Recolhido fica só o cabeçalho com o número de tarefas. */
export const Recolhido: Historia = {
  play: async ({ canvasElement }) => {
    const quadro = within(canvasElement.ownerDocument.body)
    await userEvent.click(await quadro.findByRole('button', { name: 'Recolher tarefas' }))
    await expect(quadro.getByRole('button', { name: 'Mostrar tarefas' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  },
}

export const Escuro: Historia = { ...TresEstados, globals: { tema: 'escuro' } }
