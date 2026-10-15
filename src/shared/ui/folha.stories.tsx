import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './button'
import { Campo, Entrada } from './campo'
import { Dialogo, Folha } from './folha'

const meta = { title: 'Sistema de desenho/Folha e diálogo', component: Folha } satisfies Meta<
  typeof Folha
>
export default meta
type Historia = StoryObj<typeof meta>

const args = { aberta: false, aoMudar: () => {}, titulo: '', children: null }

export const FolhaLateral: Historia = {
  args,
  render: function Render() {
    const [aberta, setAberta] = useState(true)
    return (
      <>
        <Button onClick={() => setAberta(true)}>Nova disciplina</Button>
        <Folha
          aberta={aberta}
          aoMudar={setAberta}
          titulo="Nova disciplina"
          descricao="Fica disponível para os planos curriculares em rascunho."
          rodape={
            <>
              <Button onClick={() => setAberta(false)}>Cancelar</Button>
              <Button variante="primario">Criar disciplina</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Campo rotulo="Nome" obrigatorio>
              {(c) => <Entrada {...c} />}
            </Campo>
            <Campo rotulo="Sigla">{(c) => <Entrada {...c} />}</Campo>
          </div>
        </Folha>
      </>
    )
  },
}

export const FolhaPendente: Historia = {
  args,
  render: () => (
    <Folha
      aberta
      aoMudar={() => {}}
      titulo="Nova disciplina"
      pendente
      rodape={
        <Button variante="primario" aCarregar>
          A criar
        </Button>
      }
    >
      <p className="text-texto-2">Enquanto guarda, a folha não fecha.</p>
    </Folha>
  ),
}

/** Confirmação do irreversível: diz o efeito concreto, nunca "Tem a certeza?" (guia 5.4) */
export const DialogoIrreversivel: Historia = {
  args,
  render: function Render() {
    const [aberta, setAberta] = useState(true)
    return (
      <>
        <Button variante="destrutivo" onClick={() => setAberta(true)}>
          Anular matrícula
        </Button>
        <Dialogo
          aberta={aberta}
          aoMudar={setAberta}
          titulo="Anular a matrícula de Maria Santos na 7.ª classe"
          descricao="Não pode ser desfeito. A inscrição na turma 7.ª A também termina."
          rodape={
            <>
              <Button onClick={() => setAberta(false)}>Cancelar</Button>
              <Button variante="destrutivo">Anular matrícula</Button>
            </>
          }
        >
          {null}
        </Dialogo>
      </>
    )
  },
}
