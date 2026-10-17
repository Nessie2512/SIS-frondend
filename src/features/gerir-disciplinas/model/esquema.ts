import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod'

export const esquemaDisciplina = z.object({
  nome: z
    .string()
    .trim()
    .min(3, { error: () => i18n._(msg`Escreva o nome da disciplina.`) }),
  sigla: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, { error: () => i18n._(msg`A sigla tem 2 a 5 letras, sem espaços.`) }),
})

export type DadosDisciplina = z.infer<typeof esquemaDisciplina>
