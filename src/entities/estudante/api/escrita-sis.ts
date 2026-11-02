// entities/estudante/api/escrita-sis.ts — escritas de estudantes e matrículas no backend SIS
import type { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import {
  apiSis,
  idNumerico,
  referenciaSis,
  sisKeys,
  type DtoSis,
  type EstudanteSis,
} from '@/shared/api/sis'
import { dataCivilDoSis } from '../model/mapeadores'

/**
 * O contrato publicado tipa `address` como objecto vazio; o backend aceita texto ou
 * { streetAndNumber, neighborhood, municipality, province } (@Allow no DTO).
 */
export type NovoEstudanteSis = Omit<DtoSis<'CreateStudentDto'>, 'address'> & {
  address:
    | string
    | { streetAndNumber: string; neighborhood: string; municipality: string; province: string }
}

/** Tipos de documento do backend; o texto da interface é "TIPO NÚMERO" (ex.: "BI 002145678LA043"). */
export const TIPOS_DOCUMENTO_SIS = ['BI', 'PASSPORT', 'BIRTH_CERTIFICATE', 'N/A'] as const
type TipoDocumentoSis = (typeof TIPOS_DOCUMENTO_SIS)[number]

const SINONIMOS: Record<string, TipoDocumentoSis> = {
  BI: 'BI',
  PASSAPORTE: 'PASSPORT',
  PASSPORT: 'PASSPORT',
  CEDULA: 'BIRTH_CERTIFICATE',
  CÉDULA: 'BIRTH_CERTIFICATE',
  BIRTH_CERTIFICATE: 'BIRTH_CERTIFICATE',
}

/**
 * "BI 002145678LA043", "Passaporte N1234567" ou só o número (assume-se BI). Vazio: sem documento
 * (N/A). Devolve null quando o tipo escrito não é conhecido.
 */
export function lerDocumento(
  texto: string,
): { documentType: TipoDocumentoSis; documentNumber: string } | null {
  const limpo = texto.trim()
  if (!limpo) return { documentType: 'N/A', documentNumber: '' }
  const [primeiro = '', ...resto] = limpo.split(/\s+/)
  const tipo = SINONIMOS[primeiro.toUpperCase()]
  if (tipo) return resto.length ? { documentType: tipo, documentNumber: resto.join('') } : null
  if (resto.length) return null
  return { documentType: 'BI', documentNumber: limpo }
}

/**
 * POST /students responde 201 sem corpo (o caso de uso devolve void): o estudante criado
 * procura-se na lista pelo nome e data de nascimento, ficando o mais recente (id maior).
 */
export async function criarEstudanteSis(qc: QueryClient, dados: NovoEstudanteSis) {
  await apiSis.POST('/students', { body: dados as unknown as DtoSis<'CreateStudentDto'> })
  const todos = await qc.fetchQuery({ ...referenciaSis.estudantes(), staleTime: 0 })
  const nome = dados.name.trim().toLowerCase()
  const criado = todos
    .filter(
      (e) =>
        e.name.trim().toLowerCase() === nome && dataCivilDoSis(e.birthDate) === dados.birthDate,
    )
    .sort((a, b) => b.id - a.id)[0]
  if (!criado) throw new ApiError(404, { title: 'ESTUDANTE_CRIADO_NAO_ENCONTRADO' })
  return criado
}

/**
 * POST /students/enroll: o backend pede os ids numéricos do estudante, da turma e do ano.
 * Só o chefe da secretaria tem este âmbito (student-approval); os outros recebem 403.
 */
export async function matricularSis(
  qc: QueryClient,
  pedido: { estudante: EstudanteSis | string; turmaId: string; anoLectivoId: string },
) {
  const [estudantes, turmas, anos] = await Promise.all([
    typeof pedido.estudante === 'string'
      ? qc.fetchQuery(referenciaSis.estudantes())
      : Promise.resolve([pedido.estudante]),
    qc.fetchQuery(referenciaSis.turmas()),
    qc.fetchQuery(referenciaSis.anos()),
  ])
  const uuid = typeof pedido.estudante === 'string' ? pedido.estudante : pedido.estudante.uuid
  await apiSis.POST('/students/enroll', {
    body: {
      studentId: idNumerico(estudantes, uuid),
      classId: idNumerico(turmas, pedido.turmaId),
      academicYearId: idNumerico(anos, pedido.anoLectivoId),
    },
  })
}

/** PUT /students/{uuid}/identity: tipo e número do documento. */
export async function alterarDocumentoSis(uuid: string, texto: string) {
  const documento = lerDocumento(texto)
  if (!documento) throw new ApiError(422, { title: 'DOCUMENTO_INVALIDO' })
  await apiSis.PUT('/students/{uuid}/identity', { params: { path: { uuid } }, body: documento })
}

/** DELETE /students/{uuid}: desactiva o processo (no backend, "anular" é desactivar). */
export async function anularEstudanteSis(uuid: string) {
  await apiSis.DELETE('/students/{uuid}', { params: { path: { uuid } } })
}

/** Listas em bruto que mudam depois de escrever um estudante. */
export const recarregarEstudantesSis = (qc: QueryClient) =>
  qc.invalidateQueries({ queryKey: sisKeys.lista('students') })
