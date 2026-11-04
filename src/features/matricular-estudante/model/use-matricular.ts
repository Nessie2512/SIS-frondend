import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { estudanteKeys } from '@/entities/estudante'
import { matriculaKeys, paraMatricula } from '@/entities/matricula'
import { turmaKeys } from '@/entities/turma'
import { api, ApiError, novaChaveIdempotencia } from '@/shared/api'
import { apiSis, idNumerico, referenciaSis, type EstudanteSis } from '@/shared/api/sis'
import { eReal } from '@/shared/config/ligacao'
import { soDigitos, type DadosMatricula } from './esquema'

export interface ResultadoMatricula {
  estudanteId: string
  estudanteNome: string
  numeroProcesso: string | null
  classe: string
  turma: string | null
  documentosEmFalta: number | null
}

function telefoneInternacional(valor: string) {
  const digitos = soDigitos(valor)
  return digitos.startsWith('244') ? `+${digitos}` : `+244${digitos}`
}

/**
 * O SIS exige primeiro o perfil completo do estudante e depois uma matrícula directa. Se a
 * segunda chamada falhar, conserva-se o UUID criado para não duplicar o estudante ao repetir.
 */
export function useMatricular(anoLectivoId: string) {
  const qc = useQueryClient()
  const [chave] = useState(novaChaveIdempotencia)
  const [estudanteCriado, guardarEstudanteCriado] = useState<{
    estudante: EstudanteSis
    dados: string
    anoLectivoId: string
  } | null>(null)

  return useMutation({
    mutationKey: ['matricular'],
    mutationFn: async (dados: DadosMatricula): Promise<ResultadoMatricula> => {
      if (eReal('estudantes')) {
        const anos = await qc.fetchQuery(referenciaSis.anos())
        const academicYearId = idNumerico(anos, anoLectivoId)
        const [classes, turmas] = await Promise.all([
          qc.fetchQuery(referenciaSis.classes(academicYearId, true)),
          qc.fetchQuery(referenciaSis.turmas(academicYearId)),
        ])
        const turma = turmas.find((item) => item.uuid === dados.turmaId)
        if (!turma || turma.academicYearId !== academicYearId) {
          throw new ApiError(409, {
            title: i18n._(msg`Turma indisponível`),
            detail: i18n._(msg`A turma escolhida não pertence ao ano letivo selecionado.`),
            code: 'CLASS_ACADEMIC_YEAR_MISMATCH',
          })
        }
        const assinaturaDados = JSON.stringify(dados.estudante)
        let estudante =
          estudanteCriado?.dados === assinaturaDados &&
          estudanteCriado.anoLectivoId === anoLectivoId
            ? estudanteCriado.estudante
            : null
        if (estudanteCriado && !estudante) {
          throw new ApiError(409, {
            title: i18n._(msg`Estudante já registado`),
            detail: i18n._(
              msg`O perfil já foi criado, mas os dados pessoais foram alterados. Retome a matrícula com os dados originais ou abra a ficha criada.`,
            ),
            code: 'MATRICULA_POR_CONFIRMAR',
          })
        }
        if (!estudante) {
          const encarregadoPrincipal = dados.encarregados.find((enc) => enc.principal)
          if (!encarregadoPrincipal) {
            throw new ApiError(400, {
              title: i18n._(msg`Encarregado principal obrigatório`),
              detail: i18n._(msg`Escolha um encarregado principal antes de matricular.`),
            })
          }
          const { data } = await apiSis.POST('/students', {
            body: {
              name: dados.estudante.nome,
              sex: dados.estudante.sexo,
              birthDate: dados.estudante.dataNascimento,
              address: dados.estudante.endereco,
              nationality: dados.estudante.nacionalidade,
              documentType: dados.estudante.tipoDocumento,
              documentNumber: dados.estudante.documentoIdentificacao,
              fatherName: dados.estudante.fatherName,
              fatherContact: telefoneInternacional(dados.estudante.fatherContact),
              motherName: dados.estudante.motherName,
              motherContact: telefoneInternacional(dados.estudante.motherContact),
              primaryGuardian: telefoneInternacional(encarregadoPrincipal.telefone),
              bestLanguage: dados.estudante.bestLanguage,
              familyPrefix: dados.estudante.familyPrefix,
            },
          })
          estudante = data!
          guardarEstudanteCriado({
            estudante,
            dados: assinaturaDados,
            anoLectivoId,
          })
        }
        const grade = classes.find((item) => item.id === turma.gradeId)
        if (!grade) {
          throw new ApiError(404, {
            title: i18n._(msg`Classe curricular não encontrada`),
            detail: i18n._(msg`Não foi encontrada a classe associada à turma ${turma.name}.`),
          })
        }
        await apiSis.POST('/enrollments', {
          body: {
            studentId: estudante.id,
            classId: turma.id,
            academicYearId,
          },
        })
        guardarEstudanteCriado(null)
        return {
          estudanteId: estudante.uuid,
          estudanteNome: estudante.name,
          numeroProcesso: estudante.studentCode ?? null,
          classe: grade.name,
          turma: turma.name,
          documentosEmFalta: null,
        }
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
      const matricula = paraMatricula(data!)
      return {
        estudanteId: matricula.estudanteId,
        estudanteNome: matricula.estudanteNome,
        numeroProcesso: matricula.numeroProcesso || null,
        classe: matricula.classe,
        turma: matricula.turma,
        documentosEmFalta: matricula.documentosEmFalta,
      }
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: matriculaKeys.todas }),
        qc.invalidateQueries({ queryKey: estudanteKeys.todos }),
        qc.invalidateQueries({ queryKey: turmaKeys.todas }),
      ]),
  })
}
