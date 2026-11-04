import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRascunhoMatricula } from '@/features/matricular-estudante/model/rascunho'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas } from '@/test/hook-sis'
import { renderizarEm } from '@/test/renderizar'
import { http, HttpResponse } from 'msw'
import { estudantesSis, handlersSis, meSis } from '@/test/sis'

beforeEach(() => {
  useRascunhoMatricula.getState().limpar()
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
  server.use(
    // Chefe da secretaria: regista (student-entry) e matricula (/enrollments)
    http.get('/sis/auth/me', () =>
      HttpResponse.json({
        ...meSis,
        permissions: [...meSis.permissions, 'student-entry:write', 'student-approval:write'],
      }),
    ),
  )
})
afterEach(() => definirAreasReais([]))

async function preencherAteARevisao() {
  renderizarEm('/matriculas/nova')
  const u = userEvent.setup()
  await u.type(
    await screen.findByLabelText(/Nome completo/, undefined, { timeout: 10_000 }),
    'Kiala Ngola Bento',
  )
  await u.type(screen.getByLabelText(/Data de nascimento/), '03/04/2013')
  await u.tab()
  await u.click(screen.getByRole('radio', { name: 'Masculino' }))
  await u.click(screen.getByRole('combobox', { name: /Tipo de documento/ }))
  await u.click(screen.getByRole('option', { name: 'Bilhete de identidade' }))
  await u.type(screen.getByLabelText(/Número do documento/), '002145678LA043')
  await u.type(screen.getByLabelText(/Nacionalidade/), 'Angolana')
  await u.type(screen.getByLabelText(/Rua e número/), 'Rua 1, n.º 12')
  await u.type(screen.getByLabelText(/Bairro ou quarteirão/), 'Cazenga')
  await u.type(screen.getByLabelText(/Município/), 'Cazenga')
  await u.type(screen.getByLabelText(/Província/), 'Luanda')
  await u.click(screen.getByRole('button', { name: 'Seguinte' }))

  // Pai e mãe: o backend exige os dois
  expect(await screen.findByRole('heading', { name: 'Encarregados' })).toBeInTheDocument()
  await u.type(screen.getByLabelText(/Nome do pai/), 'Pedro Bento')
  await u.type(screen.getByLabelText(/Contacto do pai/), '923 111 222')
  await u.type(screen.getByLabelText(/Nome da mãe/), 'Rosa Ngola')
  await u.type(screen.getByLabelText(/Contacto da mãe/), '931 333 444')
  await u.type(screen.getByLabelText(/Idioma preferencial/), 'Português')
  await u.type(screen.getByLabelText(/Prefixo familiar/), 'FAM-BENTO')
  await u.type(screen.getAllByLabelText(/Nome completo/)[0]!, 'Pedro Bento')
  await u.type(screen.getAllByLabelText(/Parentesco/)[0]!, 'Pai')
  await u.type(screen.getAllByLabelText(/Telefone/)[0]!, '923 111 222')
  await u.click(screen.getByRole('button', { name: 'Acrescentar encarregado' }))
  await u.type(screen.getAllByLabelText(/Nome completo/)[1]!, 'Rosa Ngola')
  await u.type(screen.getAllByLabelText(/Parentesco/)[1]!, 'Mãe')
  await u.type(screen.getAllByLabelText(/Telefone/)[1]!, '931 333 444')
  await u.click(screen.getByRole('button', { name: 'Seguinte' }))

  expect(await screen.findByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
  await u.click(screen.getByRole('button', { name: 'Seguinte' }))

  expect(await screen.findByRole('heading', { name: 'Classe e turma' })).toBeInTheDocument()
  await u.click(await screen.findByRole('combobox', { name: /Classe/ }))
  await u.click(await screen.findByRole('option', { name: /7\.ª classe/ }))
  await u.click(screen.getByRole('button', { name: 'Seguinte' }))

  expect(await screen.findByRole('heading', { name: 'Revisão' })).toBeInTheDocument()
  return u
}

describe('Assistente de matrícula no backend SIS', () => {
  it('do primeiro passo ao último: regista e matricula', async () => {
    const criado = {
      ...estudantesSis[0]!,
      id: 40,
      uuid: 'est-novo',
      name: 'Kiala Ngola Bento',
    }
    server.use(
      http.get('/sis/students/est-novo', () =>
        HttpResponse.json({ ...criado, studentCode: 'BMA20260002' }),
      ),
    )
    const pedidos = escutarEscritas({ 'POST /students': criado })
    const u = await preencherAteARevisao()
    await u.click(screen.getByRole('button', { name: 'Matricular' }))
    expect(
      await screen.findByRole(
        'heading',
        { name: /Matrícula de .* registada/ },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument()
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual([
      'POST /students',
      'POST /enrollments',
    ])
  })

  it('um erro do servidor nos encarregados volta ao passo e mostra-se', async () => {
    server.use(
      http.post('/sis/students', () =>
        HttpResponse.json(
          {
            statusCode: 422,
            error: 'Unprocessable Entity',
            message: ['motherContact must be a valid phone'],
          },
          { status: 422 },
        ),
      ),
    )
    const u = await preencherAteARevisao()
    await u.click(screen.getByRole('button', { name: 'Matricular' }))
    expect(
      await screen.findByText('motherContact must be a valid phone', undefined, { timeout: 5000 }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Encarregados' })).toBeInTheDocument()
  })

  it('um erro do servidor num dado opcional abre «Mais dados» e mostra-se', async () => {
    server.use(
      http.post('/sis/students', () =>
        HttpResponse.json(
          {
            statusCode: 422,
            error: 'Unprocessable Entity',
            message: ['documentNumber already exists'],
          },
          { status: 422 },
        ),
      ),
    )
    const u = await preencherAteARevisao()
    await u.click(screen.getByRole('button', { name: 'Matricular' }))
    expect(
      await screen.findByText('documentNumber already exists', undefined, { timeout: 5000 }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Dados pessoais' })).toBeInTheDocument()
  })
})
