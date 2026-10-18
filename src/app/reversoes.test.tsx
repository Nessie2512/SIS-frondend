import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { problema } from '@/mocks/apoio'
import { db } from '@/mocks/db'
import { server } from '@/mocks/node'
import { useAnuncios } from '@/shared/lib/anunciar'
import { renderizarEm } from '@/test/renderizar'
import { criarQueryClient } from './query-client'

const assertivo = () => useAnuncios.getState().assertivo.replace(/\u200B/g, '')

describe('Reversões anunciadas de forma assertiva, com o motivo', () => {
  beforeEach(() => useAnuncios.setState({ educado: '', assertivo: '' }))

  it('edição no sítio que falha: volta ao valor anterior e anuncia porquê', async () => {
    const alvo = db.estudantes[0]!
    const antes = alvo.morada
    server.use(
      http.patch('/api/v1/estudantes/:id', () =>
        problema(409, 'Estudante transferido', {
          detail: 'O estudante foi transferido entretanto.',
        }),
      ),
    )
    renderizarEm(`/estudantes/${alvo.id}`)
    const utilizador = userEvent.setup()
    await utilizador.click(await screen.findByRole('button', { name: /^Editar Morada:/ }))
    const campo = screen.getByLabelText('Morada')
    await utilizador.clear(campo)
    await utilizador.type(campo, 'Rua nova{Enter}')

    await waitFor(() =>
      expect(assertivo()).toMatch(/^A alteração não foi guardada e voltou ao que estava\. .+/),
    )
    expect(db.estudantes[0]!.morada).toBe(antes)
  })

  it('arrastar para uma turma recusado: diz o que voltou atrás (meta.reversao)', async () => {
    server.use(
      http.post('/api/v1/turmas/:id/inscricoes', () =>
        problema(409, 'Turma cheia', { code: 'LOTACAO_ESGOTADA' }),
      ),
    )
    renderizarEm('/turmas/quadro?classeId=c7')
    const utilizador = userEvent.setup()
    const mover = (await screen.findAllByRole('button', { name: /^Mover .* para…$/ }))[0]!
    await utilizador.click(mover)
    const opcoes = await screen.findAllByRole('menuitem')
    await utilizador.click(opcoes.find((o) => !o.hasAttribute('data-disabled'))!)
    await waitFor(() => expect(assertivo()).toMatch(/^O estudante voltou ao lugar de antes\./))
  })

  it('só as mutações optimistas (com estado de antes) anunciam reversão', async () => {
    const qc = criarQueryClient()
    const falhar = () => Promise.reject(new Error('Sem ligação ao servidor.'))
    const pessimista = qc.getMutationCache().build(qc, { mutationFn: falhar })
    await pessimista.execute(undefined).catch(() => undefined)
    expect(assertivo()).toBe('')

    const optimista = qc.getMutationCache().build(qc, {
      mutationFn: falhar,
      onMutate: () => ({ antes: 1 }),
    })
    await optimista.execute(undefined).catch(() => undefined)
    expect(assertivo()).toMatch(/^A alteração não foi guardada e voltou ao que estava\./)
  })
})
