import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { estudanteKeys } from '@/entities/estudante'
import { matriculaKeys, paraMatricula, type Matricula } from '@/entities/matricula'
import { turmaKeys } from '@/entities/turma'
import { api, novaChaveIdempotencia } from '@/shared/api'
import { sisKeys } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'
import { soDigitos, type DadosMatricula } from './esquema'
import { matricularNoSis, type MatriculaSisCache } from './matricular-sis'

/**
 * Grava a matrícula. No SIS, o perfil e a matrícula são operações separadas; mantém-se em
 * memória o estudante criado para que uma repetição não volte a executar POST /students.
 */
export function useMatricular(anoLectivoId: string) {
  const qc = useQueryClient()
  const [chave] = useState(novaChaveIdempotencia)
  const sisCache = useRef<MatriculaSisCache>(new Map())

  return useMutation({
    mutationKey: ['matricular'],
    mutationFn: async (dados: DadosMatricula): Promise<Matricula> => {
      if (eReal('estudantes')) {
        return matricularNoSis(qc, dados, anoLectivoId, sisCache.current)
      }

      const { data } = await api.POST('/matriculas', {
        params: { header: { 'Idempotency-Key': chave } },
        body: {
          anoLectivoId,
          classeId: dados.classeId,
          turmaId: dados.turmaId ?? undefined,
          estudante: {
            nome: dados.estudante.nome,
            dataNascimento: dados.estudante.dataNascimento,
            sexo: dados.estudante.sexo,
            documentoIdentificacao: dados.estudante.documentoIdentificacao || undefined,
            morada: [
              dados.estudante.endereco.streetAndNumber,
              dados.estudante.endereco.neighborhood,
              dados.estudante.endereco.municipality,
              dados.estudante.endereco.province,
            ].join(', '),
            naturalidade: dados.estudante.nacionalidade,
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
        qc.invalidateQueries({ queryKey: sisKeys.todas }),
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: estudanteKeys.todos }),
        qc.invalidateQueries({ queryKey: turmaKeys.todas }),
      ]),
  })
}
