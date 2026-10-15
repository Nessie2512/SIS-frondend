import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import {
  ControloSegmentado,
  ListaSeparadores,
  PainelSeparador,
  Separador,
  Separadores,
} from './separadores'

const meta = { title: 'Sistema de desenho/Separadores', component: Separadores } satisfies Meta<
  typeof Separadores
>
export default meta
type Historia = StoryObj<typeof meta>

export const FichaDoEstudante: Historia = {
  render: () => (
    <Separadores defaultValue="resumo">
      <ListaSeparadores rotulo="Ficha do estudante">
        <Separador valor="resumo">Resumo</Separador>
        <Separador valor="percurso">Percurso</Separador>
        <Separador valor="documentos" contador={2}>
          Documentos
        </Separador>
        <Separador valor="encarregados">Encarregados</Separador>
        <Separador valor="ocorrencias" contador={0}>
          Ocorrências
        </Separador>
        <Separador valor="oficiais" desactivado>
          Documentos oficiais
        </Separador>
      </ListaSeparadores>
      <PainelSeparador value="resumo" className="py-4 text-texto-2">
        Resumo do estudante.
      </PainelSeparador>
      <PainelSeparador value="percurso" className="py-4 text-texto-2">
        Percurso.
      </PainelSeparador>
      <PainelSeparador value="documentos" className="py-4 text-texto-2">
        2 documentos em falta.
      </PainelSeparador>
    </Separadores>
  ),
}

export const Segmentado: Historia = {
  render: function Render() {
    const [valor, setValor] = useState('ACTIVA')
    return (
      <ControloSegmentado
        rotulo="Estado da turma"
        valor={valor}
        aoMudar={setValor}
        opcoes={[
          { valor: 'ACTIVA', rotulo: 'Activas' },
          { valor: 'ENCERRADA', rotulo: 'Encerradas' },
          { valor: 'TODAS', rotulo: 'Todas', desactivado: true },
        ]}
      />
    )
  },
}
