import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { renderizarEm } from '@/test/renderizar'

function csv(linhas: string[]) {
  return new File(
    [
      ['nome;sexo;data_nascimento;bilhete;classe;encarregado;parentesco;telefone', ...linhas].join(
        '\n',
      ),
    ],
    'turma-nova.csv',
    { type: 'text/csv' },
  )
}

describe('Importação de estudantes', () => {
  it('analisa, mostra erros por linha, exige confirmação parcial e cria numa tarefa com avisos', async () => {
    const existente = db.estudantes[0]!
    const [a, m, d] = existente.dataNascimento.split('-')
    const antes = db.estudantes.length
    renderizarEm('/estudantes')
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('link', { name: 'Importar' }))
    expect(await screen.findByRole('heading', { name: 'Importar estudantes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Descarregar modelo' })).toHaveAttribute(
      'download',
      'modelo-importacao-estudantes.csv',
    )

    await utilizador.upload(
      screen.getByLabelText('Ficheiro CSV'),
      csv([
        'Ana Maria Domingos;F;14/03/2014;;7.ª classe;Rosa Domingos;Mãe;923 000 001',
        'Joana;X;14/03/2014;;7;Rosa;Mãe;123',
        `${existente.nome};${existente.sexo};${d}/${m}/${a};;7;Encarregado Teste;Pai;923000002`,
        'Pedro Afonso Neto;M;2013-09-02;;8;Afonso Neto;Pai;923000003',
      ]),
    )
    expect(
      await screen.findByText('4 linhas: 3 prontas a importar, 1 com erros.'),
    ).toBeInTheDocument()
    const erros = screen.getByRole('table', { name: 'Erros por linha' })
    expect(within(erros).getByText('Use M ou F.')).toBeInTheDocument()
    expect(
      within(erros)
        .getAllByRole('row')
        .slice(1)
        .every((r) => r.textContent?.startsWith('3')),
    ).toBe(true)
    expect(screen.getByRole('table', { name: 'Linhas prontas' })).toHaveTextContent(
      'Pedro Afonso Neto',
    )

    // Com erros, só importa depois de aceitar que essas linhas ficam de fora
    const importar = screen.getByRole('button', { name: 'Importar 3 estudantes' })
    expect(importar).toBeDisabled()
    await utilizador.click(screen.getByLabelText(/Importar só as 3 linhas sem erros/))
    await utilizador.click(importar)

    const resultado = (
      await screen.findByRole('heading', { name: 'Importação concluída' })
    ).closest('section')!
    expect(
      within(resultado).getByText('Importação de estudantes: 2 importados'),
    ).toBeInTheDocument()
    // O servidor recusa o que já existe na base, com aviso na linha certa
    const processo = existente.numeroProcesso
    const aviso = within(resultado)
      .getByText(/já existe/)
      .closest('li')!
    expect(aviso).toHaveTextContent(
      `Linha 4 · ${existente.nome} já existe (processo n.º ${processo}); não foi importado.`,
    )

    expect(db.estudantes.length).toBe(antes + 2)
    const ana = db.estudantes.find((e) => e.nome === 'Ana Maria Domingos')!
    const matricula = db.matriculas.find((x) => x.estudanteId === ana.id)!
    expect(matricula).toMatchObject({ estado: 'PENDENTE', classeId: 'c7', turmaId: null })
    expect(db.encarregados.find((x) => x.telefone === '923000001')?.nome).toBe('Rosa Domingos')

    const relatorio = await fetch(
      new URL(
        screen.getByRole('link', { name: 'Descarregar relatório' }).getAttribute('href')!,
        location.origin,
      ),
    )
    expect(await relatorio.text()).toContain('Ana Maria Domingos;7.ª classe;Importado')
  })

  it('recusa um ficheiro sem as colunas do modelo', async () => {
    renderizarEm('/estudantes/importar')
    const utilizador = userEvent.setup()
    await utilizador.upload(
      await screen.findByLabelText('Ficheiro CSV'),
      new File(['nome;idade\nAna;12'], 'errado.csv', { type: 'text/csv' }),
    )
    expect(
      (await screen.findAllByText(/^Faltam colunas no cabeçalho: sexo/)).length,
    ).toBeGreaterThan(0)
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Importar \d/ })).not.toBeInTheDocument(),
    )
  })
})
