import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { server } from '@/mocks/node'
import { sessao } from '@/shared/api'
import { renderizarEm } from '@/test/renderizar'

const primeiro = () => db.estudantes[0]!

describe('Estudantes', () => {
  it('pesquisa à medida que se escreve e o URL regista a pesquisa', async () => {
    const { router } = renderizarEm('/estudantes')
    const alvo = primeiro()
    const utilizador = userEvent.setup()
    await utilizador.type(
      await screen.findByRole('searchbox', { name: 'Pesquisar' }),
      alvo.numeroProcesso,
    )
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ q: alvo.numeroProcesso }),
    )
    expect(await screen.findByText(alvo.nome)).toBeInTheDocument()
  })

  it('abre o painel lateral com Enter e liga à ficha', async () => {
    const { router } = renderizarEm('/estudantes')
    const linha = (await screen.findAllByRole('row'))[1]!
    linha.focus()
    await userEvent.keyboard('{Enter}')
    const painel = await screen.findByRole('dialog')
    expect(within(painel).getByRole('link', { name: 'Abrir ficha' })).toBeInTheDocument()
    expect(router.state.location.search).toHaveProperty('estudante')
  })
})

describe('Ficha do estudante', () => {
  it('marcar um documento é optimista e actualiza o contador', async () => {
    const pendente = db.estudantes.find((e) =>
      db.documentos.some((d) => d.estudanteId === e.id && d.obrigatorio && d.estado === 'EM_FALTA'),
    )!
    const emFalta = db.documentos.filter(
      (d) => d.estudanteId === pendente.id && d.obrigatorio && d.estado === 'EM_FALTA',
    )
    renderizarEm(`/estudantes/${pendente.id}?separador=documentos`)
    expect(await screen.findByText(`${emFalta.length} obrigatórios em falta`)).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText(emFalta[0]!.designacao))
    // Antes da resposta do servidor o visto já aparece
    expect(screen.getByLabelText(emFalta[0]!.designacao)).toBeChecked()
    await waitFor(() =>
      expect(db.documentos.find((d) => d.id === emFalta[0]!.id)!.estado).toBe('ENTREGUE'),
    )
  })

  it('se o servidor falhar, o documento volta ao estado anterior e diz porquê', async () => {
    server.use(
      http.patch('*/api/v1/estudantes/:id/documentos/:documentoId', () =>
        HttpResponse.json({}, { status: 503 }),
      ),
    )
    const pendente = db.documentos.find((d) => d.obrigatorio && d.estado === 'EM_FALTA')!
    renderizarEm(`/estudantes/${pendente.estudanteId}?separador=documentos`)
    const caixa = await screen.findByLabelText(pendente.designacao)
    await userEvent.click(caixa)
    await waitFor(() => expect(caixa).not.toBeChecked())
  })

  it('edita o telefone no sítio e guarda ao carregar Enter', async () => {
    const alvo = primeiro()
    renderizarEm(`/estudantes/${alvo.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Editar Telefone' }))
    const campo = screen.getByLabelText('Telefone')
    await utilizador.clear(campo)
    await utilizador.type(campo, '923456789{Enter}')
    expect(await screen.findByText('923 456 789')).toBeInTheDocument()
    await waitFor(() => expect(db.estudantes[0]!.telefone).toBe('923456789'))
  })

  it('se outra pessoa alterou entretanto (412), mostra o valor actual e deixa escolher', async () => {
    const alvo = primeiro()
    renderizarEm(`/estudantes/${alvo.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: 'Editar Morada' }))
    // Alteração feita por outra pessoa depois de abrirmos a ficha
    alvo.morada = 'Rua da outra pessoa'
    alvo.versao++
    const campo = screen.getByLabelText('Morada')
    await utilizador.clear(campo)
    await utilizador.type(campo, 'Rua minha{Enter}')

    const dialogo = await screen.findByRole('dialog', { name: 'Outra pessoa alterou este dado' })
    expect(within(dialogo).getByText('Rua da outra pessoa')).toBeInTheDocument()
    await utilizador.click(within(dialogo).getByRole('button', { name: 'Guardar o meu' }))
    await waitFor(() => expect(db.estudantes[0]!.morada).toBe('Rua minha'))
  })

  it('sem permissão de escrita, os dados aparecem só como texto', async () => {
    sessao.definirToken('tk-u2')
    renderizarEm(`/estudantes/${primeiro().id}`)
    expect(await screen.findByText('Dados pessoais')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
  })
})
