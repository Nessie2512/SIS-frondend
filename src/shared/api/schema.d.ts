/**
 * ⚠️ PROVISÓRIO — escrito à mão no MESMO FORMATO que o openapi-typescript gera.
 *
 * Existe só para o projecto compilar e para os ecrãs avançarem com MSW enquanto
 * o backend não publica o OpenAPI. Quando houver `openapi.json`, corre:
 *
 *     pnpm api:gen
 *
 * e este ficheiro é substituído por inteiro. O compilador mostra então onde os
 * tipos provisórios diferem dos reais (corrige-se só nos mapeadores em entities/*\/model).
 *
 * Regra: só se acrescentam aqui os endpoints de que um ecrã precisa já, copiados
 * do contrato combinado com o backend. Nada de tipos de API fora deste ficheiro.
 */

export interface paths {
  '/auth/me': {
    get: {
      parameters: { query?: never; header?: never; path?: never; cookie?: never }
      requestBody?: never
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': components['schemas']['MeDto'] } }
      }
    }
  }
  '/anos-lectivos': {
    get: {
      parameters: { query?: never; header?: never; path?: never; cookie?: never }
      requestBody?: never
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': components['schemas']['AnoLectivoDto'][] }
        }
      }
    }
  }
  '/turmas': {
    get: {
      parameters: {
        query: {
          anoLectivoId: string
          classeId?: string
          turno?: components['schemas']['Turno']
          estado?: components['schemas']['EstadoTurma']
          page?: number
          pageSize?: number
        }
        header?: never
        path?: never
        cookie?: never
      }
      requestBody?: never
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': components['schemas']['PaginaTurmaDto'] }
        }
      }
    }
  }
  '/turmas/{id}': {
    get: {
      parameters: { query?: never; header?: never; path: { id: string }; cookie?: never }
      requestBody?: never
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': components['schemas']['TurmaDto'] } }
        404: { headers: { [name: string]: unknown }; content: { 'application/problem+json': components['schemas']['ProblemaDto'] } }
      }
    }
  }
}

export interface components {
  schemas: {
    Turno: 'MANHA' | 'TARDE' | 'NOITE'
    EstadoTurma: 'ACTIVA' | 'ENCERRADA'
    EstadoAnoLectivo: 'PLANEADO' | 'EM_CURSO' | 'ENCERRADO'
    MeDto: {
      id: string
      nome: string
      email: string
      permissoes: string[]
    }
    AnoLectivoDto: {
      id: string
      designacao: string
      /** Formato: date (AAAA-MM-DD) */
      dataInicio: string
      /** Formato: date (AAAA-MM-DD) */
      dataFim: string
      estado: components['schemas']['EstadoAnoLectivo']
    }
    TurmaDto: {
      id: string
      designacao: string
      classeId: string
      classeDesignacao: string
      turno: components['schemas']['Turno']
      sala: string | null
      lotacaoMaxima: number
      inscritos: number
      estado: components['schemas']['EstadoTurma']
    }
    PaginaTurmaDto: {
      items: components['schemas']['TurmaDto'][]
      total: number
      page: number
      pageSize: number
    }
    /** application/problem+json (RFC 9457) com extensões do domínio */
    ProblemaDto: {
      type?: string
      title: string
      status: number
      detail?: string
      code?: string
      requestId?: string
      errors?: { campo: string; mensagem: string; code?: string }[]
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}

export type $defs = Record<string, never>
export type operations = Record<string, never>
