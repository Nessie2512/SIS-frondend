// entities/estudante/api/escrita-sis.ts — escritas de estudantes e matrículas no backend SIS
import type { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import {
  apiSis,
  doAno,
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
 * POST /students devolve o estudante criado, com o id interno que a matrícula pede. Sem
 * matrícula, o estudante ainda não aparece nas listagens do ano (guia de integração, 1); por
 * isso a resposta é a única forma de o encontrar. Servidores antigos respondiam sem corpo:
 * aí procura-se na lista pelo nome e data de nascimento (só encontra quem já tem matrícula).
 */
export async function criarEstudanteSis(qc: QueryClient, dados: NovoEstudanteSis) {
  const { data } = await apiSis.POST('/students', {
    body: dados as unknown as DtoSis<'CreateStudentDto'>,
  })
  const criado = data as EstudanteSis | undefined
  if (criado?.uuid && criado.id) return criado
  const todos = await qc.fetchQuery({ ...referenciaSis.estudantes(), staleTime: 0 })
  const nome = dados.name.trim().toLowerCase()
  const encontrado = todos
    .filter(
      (e) =>
        e.name.trim().toLowerCase() === nome && dataCivilDoSis(e.birthDate) === dados.birthDate,
    )
    .sort((a, b) => b.id - a.id)[0]
  if (!encontrado) throw new ApiError(404, { title: 'ESTUDANTE_CRIADO_NAO_ENCONTRADO' })
  return encontrado
}

/**
 * POST /enrollments (guia de integração, 3): matrícula directa com os ids numéricos do
 * estudante, da turma e do ano. O backend valida ano e turma activos, a turma do mesmo ano e a
 * lotação (409), e atribui o código do estudante se ainda não o tiver.
 */
export async function matricularSis(
  qc: QueryClient,
  pedido: { estudante: EstudanteSis | string; turmaId: string; anoLectivoId: string },
) {
  const [estudante, turmas, anos] = await Promise.all([
    typeof pedido.estudante === 'string'
      ? estudanteEmQualquerAno(qc, pedido.estudante)
      : Promise.resolve(pedido.estudante),
    qc.fetchQuery(referenciaSis.turmas(pedido.anoLectivoId)),
    qc.fetchQuery(referenciaSis.anos()),
  ])
  await apiSis.POST('/enrollments', {
    body: {
      studentId: estudante.id,
      classId: idNumerico(turmas, pedido.turmaId),
      academicYearId: idNumerico(anos, pedido.anoLectivoId),
    },
  })
}

/**
 * Um estudante já registado, pelo uuid. As listagens são por ano e só trazem quem lá tem
 * matrícula: procura-se no ano em contexto e depois nos outros, do mais recente para trás.
 */
async function estudanteEmQualquerAno(qc: QueryClient, uuid: string): Promise<EstudanteSis> {
  const noContexto = (await qc.fetchQuery(referenciaSis.estudantes())).find((e) => e.uuid === uuid)
  if (noContexto) return noContexto
  const anos = [...(await qc.fetchQuery(referenciaSis.anos()))].sort(
    (a, b) => b.startYear - a.startYear,
  )
  for (const ano of anos) {
    const achado = (await qc.fetchQuery(referenciaSis.estudantes(ano.uuid))).find(
      (e) => e.uuid === uuid,
    )
    if (achado) return achado
  }
  throw new ApiError(404, { title: 'REFERENCIA_NAO_ENCONTRADA', detail: uuid })
}

/** O estudante como ficou depois da matrícula (já com o código), lido no ano da matrícula. */
export async function estudanteNoAnoSis(qc: QueryClient, uuid: string, anoLectivoId: string) {
  const { data } = await apiSis.GET('/students/{uuid}', {
    params: {
      path: { uuid },
      ...doAno(idNumerico(await qc.fetchQuery(referenciaSis.anos()), anoLectivoId)),
    },
  })
  return data as EstudanteSis
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
