import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod'

export const TIPOS = ['PEDAGOGICA', 'DISCIPLINAR', 'SAUDE', 'OUTRA'] as const

export function esquemaOcorrencia(hoje: string) {
  return z.object({
    tipo: z.enum(TIPOS),
    data: z
      .string()
      .min(10, { error: () => i18n._(msg`Indique a data.`) })
      .refine((d) => d <= hoje, { error: () => i18n._(msg`A data não pode ser no futuro.`) }),
    descricao: z
      .string()
      .trim()
      .min(10, { error: () => i18n._(msg`Descreva o que aconteceu (pelo menos 10 caracteres).`) }),
  })
}

export type DadosOcorrencia = z.infer<ReturnType<typeof esquemaOcorrencia>>
