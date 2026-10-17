import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { estudanteKeys } from '@/entities/estudante'
import { matriculaKeys, paraMatricula } from '@/entities/matricula'
import { turmaKeys } from '@/entities/turma'
import { api, novaChaveIdempotencia } from '@/shared/api'
import { soDigitos, type DadosMatricula } from './esquema'

/**
 * Gravar a matrícula (guia 5.1: semi-optimista). A Idempotency-Key é gerada uma vez por
 * assistente e reutilizada em repetições do mesmo gesto (guia 4.5, 5.5).
 */
export function useMatricular(anoLectivoId: string) {
  const qc = useQueryClient()
  const [chave] = useState(novaChaveIdempotencia)

  return useMutation({
    mutationKey: ['matricular'],
    mutationFn: async (dados: DadosMatricula) => {
      const e = dados.estudante
      const { data } = await api.POST('/matriculas', {
        params: { header: { 'Idempotency-Key': chave } },
        body: {
          anoLectivoId,
          classeId: dados.classeId,
          turmaId: dados.turmaId ?? undefined,
          estudante: {
            nome: e.nome,
            dataNascimento: e.dataNascimento,
            sexo: e.sexo,
            documentoIdentificacao: e.documentoIdentificacao || undefined,
            telefone: e.telefone ? soDigitos(e.telefone) : undefined,
            morada: e.morada || undefined,
            naturalidade: e.naturalidade || undefined,
          },
          encarregados: dados.encarregados.map((enc) => ({
            nome: enc.nome,
            parentesco: enc.parentesco,
            telefone: soDigitos(enc.telefone),
            email: enc.email || undefined,
            principal: enc.principal,
          })),
          documentosEntregues: dados.documentosEntregues,
          duplicadoIgnoradoJustificacao: dados.duplicado.ignorado
            ? dados.duplicado.justificacao
            : undefined,
          transferenciaEntrada: dados.transferencia.activa
            ? {
                escolaOrigem: dados.transferencia.escola,
                classesConcluidas: dados.transferencia.classesConcluidas,
              }
            : undefined,
        },
      })
      return paraMatricula(data!)
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: estudanteKeys.todos }),
        qc.invalidateQueries({ queryKey: turmaKeys.todas }),
      ]),
  })
}
