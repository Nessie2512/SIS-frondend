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
  it('POST /teachers com a morada em partes e o ciclo pelo id numérico', async () => {
    const pedidos = escutarEscritas()
    const { result } = hookComCliente(() => useCriarProfessor())
    await act(() =>
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
        cicloId: 'nivel-ii',
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
        academicLevelId: 2,
        teacherField: 'STEM',
        educationalAttainment: "Bachelor's degree",
      },
    })
  })
})
