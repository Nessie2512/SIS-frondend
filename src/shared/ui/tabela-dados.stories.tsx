import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './button'
import { EstadoVazio } from './estado-vazio'
import { EtiquetaEstado } from './etiqueta-estado'
import { TabelaDados } from './tabela-dados'
import { colunasDe, type ColunaTabela } from './tabela-recursos'

interface Estudante {
  id: string
  processo: string
  nome: string
  classe: string
  estado: 'ACTIVO' | 'TRANSFERIDO'
}

const nomes = [
  'Maria Santos',
  'João Mateus',
  'Ana Domingos',
  'Pedro Cassoma',
  'Luísa Neto',
  'Carlos Lopes',
]
const gerar = (n: number): Estudante[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    processo: `2026/${String(i + 1).padStart(5, '0')}`,
    nome: `${nomes[i % nomes.length]} ${i + 1}`,
    classe: `${7 + (i % 4)}.ª classe`,
    estado: i % 9 === 0 ? 'TRANSFERIDO' : 'ACTIVO',
  }))

const c = colunasDe<Estudante>()
const colunas: ColunaTabela<Estudante>[] = [
  c.accessor('processo', {
    header: 'Processo',
    cell: (i) => <span className="tabular">{i.getValue()}</span>,
  }),
  c.accessor('nome', {
    header: 'Nome',
    cell: (i) => <span className="font-medium">{i.getValue()}</span>,
  }),
  c.accessor('classe', { header: 'Classe' }),
  c.accessor('estado', {
    header: 'Estado',
    cell: (i) =>
      i.getValue() === 'ACTIVO' ? (
        <EtiquetaEstado tom="sucesso">Activo</EtiquetaEstado>
      ) : (
        <EtiquetaEstado tom="aviso">Transferido</EtiquetaEstado>
      ),
  }),
]

const meta = {
  title: 'Sistema de desenho/Tabela de dados',
  component: TabelaDados<Estudante>,
  args: { rotulo: 'Estudantes', colunas, dados: gerar(12), idDaLinha: (e: Estudante) => e.id },
} satisfies Meta<typeof TabelaDados<Estudante>>
export default meta
type Historia = StoryObj<typeof meta>

export const Confortavel: Historia = {}
export const ACarregar: Historia = { args: { dados: undefined, aCarregar: true } }
export const Vazia: Historia = {
  args: {
    dados: [],
    vazio: (
      <EstadoVazio
        variante="sem-resultados"
        titulo="Nenhum estudante corresponde aos filtros."
        descricao="Retire um filtro para ver mais resultados."
      />
    ),
  },
}
export const ComErro: Historia = {
  args: { dados: undefined, erro: true, aoTentarDeNovo: () => {} },
}
export const LinhaAberta: Historia = { args: { idActiva: 'e3', aoAbrir: () => {} } }
export const Seleccao: Historia = {
  args: {
    seleccionavel: true,
    accoesLote: (ids: string[], limpar: () => void) => (
      <Button tamanho="compacto" variante="primario" onClick={limpar}>
        Inscrever {ids.length} na turma
      </Button>
    ),
  },
}
/** Mais de 100 linhas: virtualiza e continua navegável por setas */
export const Virtualizada: Historia = {
  args: { dados: gerar(2000), alturaMaxima: 480 },
  render: function Render(a) {
    const [aberto, setAberto] = useState<Estudante | null>(null)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-secundario text-texto-3">
          Aberto: {aberto?.nome ?? '—'} (Enter abre; setas, PageUp/PageDown, Home/End navegam)
        </p>
        <TabelaDados {...a} aoAbrir={setAberto} />
      </div>
    )
  },
}
