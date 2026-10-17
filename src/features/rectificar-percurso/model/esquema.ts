import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod'

export const esquemaRectificacao = z.object({
  descricao: z
    .string()
    .trim()
    .min(3, { error: () => i18n._(msg`Escreva o registo correcto.`) }),
  motivo: z
    .string()
    .trim()
    .min(10, { error: () => i18n._(msg`Explique o motivo (pelo menos 10 caracteres).`) }),
})

export type DadosRectificacao = z.infer<typeof esquemaRectificacao>
