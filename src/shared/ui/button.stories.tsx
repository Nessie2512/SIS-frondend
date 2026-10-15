import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from './button'

const meta = {
  title: 'Sistema de desenho/Botão',
  component: Button,
  args: { children: 'Matricular' },
} satisfies Meta<typeof Button>
export default meta
type Historia = StoryObj<typeof meta>

export const Primario: Historia = { args: { variante: 'primario' } }
export const Secundario: Historia = { args: { variante: 'secundario', children: 'Cancelar' } }
export const Discreto: Historia = { args: { variante: 'discreto', children: 'Ver histórico' } }
export const Destrutivo: Historia = {
  args: { variante: 'destrutivo', children: 'Anular matrícula' },
}
export const ComIcone: Historia = {
  args: {
    variante: 'primario',
    children: (
      <>
        <Plus aria-hidden /> Nova turma
      </>
    ),
  },
}
export const SoIcone: Historia = {
  args: { tamanho: 'icone', 'aria-label': 'Eliminar', children: <Trash2 aria-hidden /> },
}
export const Desactivado: Historia = {
  args: { variante: 'primario', disabled: true, title: 'Complete os documentos obrigatórios' },
}
export const ACarregar: Historia = {
  args: { variante: 'primario', aCarregar: true, children: 'A emitir' },
}
export const Compacto: Historia = { args: { tamanho: 'compacto' } }

/** Todos os estados lado a lado, para rever num relance (guia 6.4, ponto 2) */
export const Todos: Historia = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variante="primario">Matricular</Button>
      <Button>Cancelar</Button>
      <Button variante="discreto">Ver histórico</Button>
      <Button variante="destrutivo">Anular</Button>
      <Button variante="primario" disabled>
        Desactivado
      </Button>
      <Button variante="primario" aCarregar>
        A guardar
      </Button>
    </div>
  ),
}

/** asChild: o botão empresta o estilo a uma ligação (sem envolver o filho) */
export const ComoLigacao: Historia = {
  args: { asChild: true, variante: 'primario', children: <a href="#turmas">Ver turmas</a> },
}
