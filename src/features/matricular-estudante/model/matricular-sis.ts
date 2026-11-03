import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { QueryClient } from '@tanstack/react-query'
import {
  criarEstudanteSis,
  estudanteNoAnoSis,
  lerDocumento,
  matricularSis,
  type NovoEstudanteSis,
} from '@/entities/estudante'
import { paraMatricula, type Matricula } from '@/entities/matricula'
import { ApiError, eApiError } from '@/shared/api'
import { referenciaSis } from '@/shared/api/sis'
import { soDigitos, type DadosMatricula } from './esquema'

/**
 * Valores enviados ao backend, não mostrados na interface (por isso fora da tradução):
 * o assistente não pergunta a nacionalidade nem a língua; a escola é angolana e ensina em português.
 */
// eslint-disable-next-line lingui/no-unlocalized-strings -- valor de dados para a API
const NACIONALIDADE_PADRAO = 'Angolana'
// eslint-disable-next-line lingui/no-unlocalized-strings -- valor de dados para a API
const LINGUA_PADRAO = 'Português'

/** Telefone para o backend: com o indicativo de Angola, como nos exemplos do contrato. */
const comIndicativo = (telefone: string) => `+244${soDigitos(telefone)}`

const PAI = /^pai$|padrasto/i
const MAE = /^m[ãa]e$|madrasta/i

/**
 * O backend exige pai, mãe (nome e contacto) e o contacto do encarregado principal. Saem dos
 * encarregados do assistente pelo parentesco; sem pai ou mãe, a gravação pára no passo dos
 * encarregados com o motivo, em vez de inventar dados.
 */
export function paraNovoEstudanteSis(dados: DadosMatricula): NovoEstudanteSis {
  const e = dados.estudante
  const pai = dados.encarregados.find((x) => PAI.test(x.parentesco.trim()))
  const mae = dados.encarregados.find((x) => MAE.test(x.parentesco.trim()))
  const principal = dados.encarregados.find((x) => x.principal) ?? dados.encarregados[0]
  const documento = lerDocumento(e.documentoIdentificacao)
  const erros = [
    ...(!pai || !mae
      ? [
          {
            campo: 'encarregados',
            mensagem: i18n._(
              msg`O servidor pede o nome e o telefone do pai e da mãe. Acrescente-os como encarregados, com o parentesco Pai e Mãe.`,
            ),
          },
        ]
      : []),
    ...(!documento
      ? [
          {
            campo: 'documentoIdentificacao',
            mensagem: i18n._(msg`Escreva o tipo e o número, por exemplo BI 002145678LA043.`),
          },
        ]
      : []),
  ]
  if (erros.length || !pai || !mae || !principal || !documento) {
    throw new ApiError(422, { title: 'DADOS_EM_FALTA', errors: erros })
  }
  const apelido = e.nome.trim().split(/\s+/).at(-1) ?? e.nome
  return {
    name: e.nome.trim(),
    sex: e.sexo,
    birthDate: e.dataNascimento,
    address: e.morada.trim(),
    // O assistente pergunta a naturalidade (local); a nacionalidade assume-se angolana
    nationality: NACIONALIDADE_PADRAO,
    ...documento,
    fatherName: pai.nome.trim(),
    fatherContact: comIndicativo(pai.telefone),
    motherName: mae.nome.trim(),
    motherContact: comIndicativo(mae.telefone),
    primaryGuardian: comIndicativo(principal.telefone),
    bestLanguage: LINGUA_PADRAO,
    // Agrupamento familiar da escola: FAM- e o último apelido, como nos dados do backend
    familyPrefix: `FAM-${apelido
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()}`,
  }
}

/**
 * Backend SIS (guia de integração, 3): primeiro o cadastro (POST /students), depois, havendo
 * turma, a matrícula directa (POST /enrollments), que atribui o código do estudante. Sem turma,
 * ou para quem não pode matricular (403), o estudante fica criado e a matrícula a confirmar.
 */
export async function matricularNoSis(
  qc: QueryClient,
  dados: DadosMatricula,
  anoLectivoId: string,
): Promise<Matricula> {
  let estudante = await criarEstudanteSis(qc, paraNovoEstudanteSis(dados))
  let confirmada = false
  if (dados.turmaId) {
    try {
      await matricularSis(qc, { estudante, turmaId: dados.turmaId, anoLectivoId })
      confirmada = true
      // Já matriculado: aparece no ano e traz o código atribuído na matrícula
      estudante = await estudanteNoAnoSis(qc, estudante.uuid, anoLectivoId).catch(() => estudante)
    } catch (erro) {
      if (!eApiError(erro) || erro.status !== 403) throw erro
    }
  }
  const [classes, turmas] = await Promise.all([
    qc.fetchQuery(referenciaSis.classes(anoLectivoId)),
    qc.fetchQuery(referenciaSis.turmas(anoLectivoId)),
  ])
  return paraMatricula({
    id: '',
    estudanteId: estudante.uuid,
    estudanteNome: estudante.name,
    numeroProcesso: estudante.studentCode ?? '',
    anoLectivoId,
    classeId: dados.classeId,
    classeDesignacao: classes.find((c) => c.uuid === dados.classeId)?.name ?? '',
    turmaId: dados.turmaId,
    turmaDesignacao: turmas.find((t) => t.uuid === dados.turmaId)?.name ?? null,
    estado: confirmada ? 'CONFIRMADA' : 'PENDENTE',
    documentosEmFalta: 0,
    criadaEm: new Date().toISOString(),
  })
}
