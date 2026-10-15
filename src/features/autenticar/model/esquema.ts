import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod/mini'

/** zod/mini: o formulário também aparece por cima do ecrã quando a sessão expira (JavaScript inicial). */
export const esquemaEntrada = z.object({
  email: z
    .string()
    .check(z.trim(), z.email({ error: () => i18n._(msg`Escreva um email válido.`) })),
  palavraPasse: z
    .string()
    .check(z.minLength(1, { error: () => i18n._(msg`Escreva a palavra-passe.`) })),
})

export type DadosEntrada = z.infer<typeof esquemaEntrada>
