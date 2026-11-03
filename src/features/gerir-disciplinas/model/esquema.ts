import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod'

/**
 * Sigla: 2 a 5 letras maiúsculas; a barra (/) é o único carácter especial e só entre letras
 * (EMC, L/P). O backend aceita qualquer código com 2 ou mais caracteres.
 */
export const FORMATO_SIGLA = /^(?=(?:\/?[A-Z]){2,5}$)[A-Z]+(?:\/[A-Z]+)*$/

export const esquemaDisciplina = z.object({
  nome: z
    .string()
    .trim()
    .min(3, { error: () => i18n._(msg`Escreva o nome da disciplina.`) }),
  sigla: z
    .string()
    .trim()
    .toUpperCase()
    .regex(FORMATO_SIGLA, {
      error: () =>
        i18n._(msg`A sigla tem 2 a 5 letras, sem espaços; pode ter uma barra (/) entre letras.`),
    }),
})

export type DadosDisciplina = z.infer<typeof esquemaDisciplina>
