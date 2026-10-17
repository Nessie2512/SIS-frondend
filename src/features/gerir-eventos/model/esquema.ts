import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod'

export const TIPOS_CRIAVEIS = ['EVENTO', 'DATA_CHAVE', 'INTERRUPCAO'] as const

/** O início é o dia aberto; o fim vem do formulário e não pode ser antes. */
export function esquemaEvento(inicio: string, fimDoAno: string) {
  return z
    .object({
      titulo: z
        .string()
        .trim()
        .min(3, { error: () => i18n._(msg`Escreva o nome do evento.`) }),
      tipo: z.enum(TIPOS_CRIAVEIS),
      fim: z.string().min(10, { error: () => i18n._(msg`Indique o último dia.`) }),
    })
    .refine((d) => d.fim >= inicio, {
      path: ['fim'],
      error: () => i18n._(msg`O último dia não pode ser antes do primeiro.`),
    })
    .refine((d) => d.fim <= fimDoAno, {
      path: ['fim'],
      error: () => i18n._(msg`O evento tem de terminar dentro do ano lectivo.`),
    })
}

export type DadosEvento = z.infer<ReturnType<typeof esquemaEvento>>
