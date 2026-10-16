import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search } from 'lucide-react'
import { AreaTexto, Campo, Entrada } from './campo'

const meta = { title: 'Sistema de desenho/Campo de texto', component: Campo } satisfies Meta<
  typeof Campo
>
export default meta
type Historia = StoryObj<typeof meta>

const base = { rotulo: 'Nome completo', children: () => null }

export const Repouso: Historia = {
  args: base,
  render: (a) => <Campo {...a}>{(c) => <Entrada {...c} />}</Campo>,
}
export const Preenchido: Historia = {
  args: { ...base, descricao: 'Como consta no documento de identificação.' },
  render: (a) => <Campo {...a}>{(c) => <Entrada {...c} defaultValue="Maria Santos" />}</Campo>,
}
export const Obrigatorio: Historia = {
  args: { ...base, obrigatorio: true },
  render: (a) => <Campo {...a}>{(c) => <Entrada {...c} />}</Campo>,
}
export const ComErro: Historia = {
  args: { ...base, rotulo: 'Telefone', erro: 'O telefone tem 9 dígitos.' },
  render: (a) => (
    <Campo {...a}>{(c) => <Entrada {...c} defaultValue="92312" inputMode="tel" />}</Campo>
  ),
}
export const ComPrefixo: Historia = {
  args: { ...base, rotulo: 'Pesquisar estudante' },
  render: (a) => (
    <Campo {...a}>
      {(c) => <Entrada {...c} prefixo={<Search aria-hidden />} placeholder="Nome ou processo" />}
    </Campo>
  ),
}
export const ComSufixo: Historia = {
  args: { ...base, rotulo: 'Propina mensal' },
  render: (a) => <Campo {...a}>{(c) => <Entrada {...c} sufixo="Kz" inputMode="decimal" />}</Campo>,
}
export const Desactivado: Historia = {
  args: base,
  render: (a) => (
    <Campo {...a}>{(c) => <Entrada {...c} disabled defaultValue="Maria Santos" />}</Campo>
  ),
}
export const SoLeitura: Historia = {
  args: { ...base, rotulo: 'Número de processo', descricao: 'Imutável.' },
  render: (a) => (
    <Campo {...a}>
      {(c) => <Entrada {...c} readOnly defaultValue="2026/00134" className="tabular" />}
    </Campo>
  ),
}
export const Area: Historia = {
  args: { ...base, rotulo: 'Motivo' },
  render: (a) => (
    <Campo {...a}>{(c) => <AreaTexto {...c} placeholder="Explique em poucas palavras" />}</Campo>
  ),
}
