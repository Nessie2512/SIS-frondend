import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { AREAS_API, definirAreasReais } from '@/shared/config/ligacao'
import { escutarEscritas, hookComCliente } from '@/test/hook-sis'
import { handlersSis } from '@/test/sis'
import { PESSOA_VAZIA } from '@/shared/lib/pessoa'
import { useCriarProfessor } from './use-criar-professor'

beforeEach(() => {
  definirAreasReais(AREAS_API)
  server.use(...handlersSis())
})
afterEach(() => definirAreasReais([]))

describe('novo professor no backend SIS', () => {
  it('POST /teachers sem email, palavra-passe nem ciclo; devolve o docente criado', async () => {
    const pedidos = escutarEscritas({ 'POST /teachers': { id: 51, uuid: 'prof-novo' } })
    const { result } = hookComCliente(() => useCriarProfessor())
    const criado = await act(() =>
      result.current.mutateAsync({
        ...PESSOA_VAZIA,
        nome: 'Helena Capita',
        sexo: 'F',
        dataNascimento: '1988-06-12',
        nacionalidade: 'Angolana',
        rua: 'Rua 21, n.º 4',
        bairro: 'Maianga',
        municipio: 'Luanda',
        provincia: 'Luanda',
        disciplinas: ['disc-mat', 'disc-port'],
        area: 'STEM',
        habilitacao: "Bachelor's degree",
        supervisor: false,
      }),
    )
    expect(pedidos[0]).toEqual({
      metodo: 'POST',
      caminho: '/teachers',
      corpo: {
        name: 'Helena Capita',
        sex: 'F',
        birthDate: '1988-06-12',
        address: {
          streetAndNumber: 'Rua 21, n.º 4',
          neighborhood: 'Maianga',
          municipality: 'Luanda',
          province: 'Luanda',
        },
        nationality: 'Angolana',
        isSupervisor: false,
        teacherField: 'STEM',
        educationalAttainment: "Bachelor's degree",
        specialtySubjectIds: [100, 101],
      },
    })
    expect(criado).toMatchObject({ uuid: 'prof-novo' })
  })
})
