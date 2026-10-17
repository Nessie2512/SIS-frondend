import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import * as z from 'zod'

/** Atribuir: só o docente. Substituir: também a data e o motivo (guia 2.3). */
export function esquemaAtribuicao(substituicao: boolean, minimo: string, maximo: string) {
  return z
    .object({
      professorId: z.string().min(1, { error: () => i18n._(msg`Escolha o docente.`) }),
      desde: z.string(),
      motivo: z.string(),
    })
    .superRefine((dados, ctx) => {
      if (!substituicao) return
      if (!dados.desde || dados.desde < minimo || dados.desde > maximo) {
        ctx.addIssue({
          code: 'custom',
          path: ['desde'],
          message: i18n._(msg`Escolha uma data dentro do ano, depois da atribuição actual.`),
        })
      }
      if (dados.motivo.trim().length < 5) {
        ctx.addIssue({
          code: 'custom',
          path: ['motivo'],
          message: i18n._(msg`Diga porque muda de docente (pelo menos 5 caracteres).`),
        })
      }
    })
}

export type DadosAtribuicao = z.infer<ReturnType<typeof esquemaAtribuicao>>
