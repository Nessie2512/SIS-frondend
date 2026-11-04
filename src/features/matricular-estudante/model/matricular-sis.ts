import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { QueryClient } from '@tanstack/react-query'
import {
  criarEstudanteSis,
  estudanteNoAnoSis,
  matricularSis,
  type NovoEstudanteSis,
} from '@/entities/estudante'
import { paraMatricula, type Matricula } from '@/entities/matricula'
import { ApiError, eApiError } from '@/shared/api'
import { idNumerico, referenciaSis, type EstudanteSis } from '@/shared/api/sis'
import { soDigitos, type DadosMatricula } from './esquema'

/** Telefone para o backend: com o indicativo de Angola, como nos exemplos do contrato. */
const comIndicativo = (telefone: string) => {
  const digitos = soDigitos(telefone)
  return digitos.startsWith('244') ? `+${digitos}` : `+244${digitos}`
}

export function paraNovoEstudanteSis(dados: DadosMatricula): NovoEstudanteSis {
  const e = dados.estudante
  const principal = dados.encarregados.find((x) => x.principal)
  if (!principal) {
    throw new ApiError(422, {
      title: 'DADOS_EM_FALTA',
      errors: [
        {
          campo: 'encarregados',
          mensagem: i18n._(msg`Escolha um encarregado principal.`),
        },
      ],
    })
  }
  return {
    name: e.nome.trim(),
    sex: e.sexo,
    birthDate: e.dataNascimento,
    address: e.endereco,
    nationality: e.nacionalidade.trim(),
    documentType: e.tipoDocumento,
    documentNumber: e.documentoIdentificacao.trim(),
    fatherName: e.fatherName.trim(),
    fatherContact: comIndicativo(e.fatherContact),
    motherName: e.motherName.trim(),
    motherContact: comIndicativo(e.motherContact),
    primaryGuardian: comIndicativo(principal.telefone),
    bestLanguage: e.bestLanguage.trim(),
    familyPrefix: e.familyPrefix.trim(),
  }
}

export interface EstudanteSisCriado {
  assinatura: string
  estudante: EstudanteSis
  matriculaConfirmada: boolean
}

export type MatriculaSisCache = Map<string, EstudanteSisCriado>

/**
 * Backend SIS (guia de integração, 3): primeiro o cadastro (POST /students), depois, havendo
 * turma, a matrícula directa (POST /enrollments), que atribui o código do estudante. Sem turma,
 * ou para quem não pode matricular (403), o estudante fica criado e a matrícula a confirmar.
 */
export async function matricularNoSis(
  qc: QueryClient,
  dados: DadosMatricula,
  anoLectivoId: string,
  cache: MatriculaSisCache = new Map(),
): Promise<Matricula> {
  const novoEstudante = paraNovoEstudanteSis(dados)
  const [anos, classes, turmas] = await Promise.all([
    qc.fetchQuery(referenciaSis.anos()),
    qc.fetchQuery(referenciaSis.classes(anoLectivoId)),
    qc.fetchQuery(referenciaSis.turmas(anoLectivoId)),
  ])
  const academicYearId = idNumerico(anos, anoLectivoId)
  const classe = classes.find((item) => item.uuid === dados.classeId)
  if (!classe) {
    throw new ApiError(404, {
      title: i18n._(msg`Classe curricular não encontrada`),
      detail: i18n._(msg`A classe selecionada não existe no ano letivo escolhido.`),
    })
  }
  const turma = dados.turmaId ? turmas.find((item) => item.uuid === dados.turmaId) : undefined
  if (dados.turmaId && (!turma || turma.academicYearId !== academicYearId || turma.gradeId !== classe.id)) {
    throw new ApiError(409, {
      title: i18n._(msg`Turma indisponível`),
      detail: i18n._(msg`A turma escolhida não pertence à classe e ao ano letivo selecionados.`),
      code: 'CLASS_ACADEMIC_YEAR_MISMATCH',
    })
  }

  const identidade = JSON.stringify([
    anoLectivoId,
    dados.estudante.nome.trim().replace(/\s+/g, ' ').toLocaleLowerCase(),
    dados.estudante.dataNascimento,
  ])
  const assinatura = JSON.stringify(novoEstudante)
  let guardado = cache.get(identidade)
  if (guardado && guardado.assinatura !== assinatura) {
    throw new ApiError(409, {
      title: i18n._(msg`Estudante já registado`),
      detail: i18n._(
        msg`O perfil já foi criado com estes dados pessoais. Retome a operação com os dados originais.`,
      ),
      code: 'MATRICULA_POR_CONFIRMAR',
    })
  }
  if (!guardado) {
    const estudante = await criarEstudanteSis(qc, novoEstudante, anoLectivoId)
    guardado = { assinatura, estudante, matriculaConfirmada: false }
    cache.set(identidade, guardado)
  }

  if (turma && !guardado.matriculaConfirmada) {
    try {
      await matricularSis(qc, {
        estudante: guardado.estudante,
        turmaId: turma.uuid,
        anoLectivoId,
        classeId: classe.uuid,
      })
      guardado.matriculaConfirmada = true
    } catch (erro) {
      if (!eApiError(erro) || erro.status !== 403) throw erro
    }
  }

  const estudante =
    guardado.matriculaConfirmada
      ? await estudanteNoAnoSis(qc, guardado.estudante.uuid, anoLectivoId)
      : guardado.estudante
  return paraMatricula({
    id: '',
    estudanteId: estudante.uuid,
    estudanteNome: estudante.name,
    numeroProcesso: estudante.studentCode ?? '',
    anoLectivoId,
    classeId: dados.classeId,
    classeDesignacao: classe.name,
    turmaId: dados.turmaId,
    turmaDesignacao: turma?.name ?? null,
    estado: guardado.matriculaConfirmada ? 'CONFIRMADA' : 'PENDENTE',
    documentosEmFalta: 0,
    criadaEm: new Date().toISOString(),
  })
}
