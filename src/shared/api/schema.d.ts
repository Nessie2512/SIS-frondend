/**
 * ⚠️ PROVISÓRIO — escrito à mão com a MESMA FORMA que o openapi-typescript gera.
 *
 * Existe para o projecto compilar e para os ecrãs avançarem com MSW enquanto o backend
 * não publica o OpenAPI. Quando houver `openapi.json`, corre:
 *
 *     pnpm api:gen
 *
 * e este ficheiro é substituído por inteiro. O compilador mostra então onde o contrato
 * provisório difere do real (corrige-se nos mapeadores em entities/<nome>/model).
 *
 * Regra: só se acrescentam aqui os endpoints de que um ecrã precisa, acordados com o backend.
 * Os auxiliares no fundo do ficheiro só existem para encurtar a escrita à mão.
 */

export interface paths {
  // Sessão
  '/auth/login': { post: Op<{ body: S['LoginDto']; ok: S['SessaoDto']; erros: 401 | 429 }> }
  '/auth/refresh': { post: Op<{ ok: S['TokenDto']; erros: 401 }> }
  '/auth/logout': { post: Op<{ ok: S['VazioDto'] }> }
  '/auth/me': { get: Op<{ ok: S['MeDto'] }> }

  // Referência
  '/anos-lectivos': { get: Op<{ ok: S['AnoLectivoDto'][] }> }
  '/classes': { get: Op<{ ok: S['ClasseDto'][] }> }

  // Painel e pesquisa
  '/painel': { get: Op<{ query: { anoLectivoId: string }; ok: S['PainelDto'] }> }
  '/pesquisa': { get: Op<{ query: { q: string; anoLectivoId: string }; ok: S['PesquisaDto'] }> }

  // Estudantes
  '/estudantes': {
    get: Op<{
      query: {
        anoLectivoId: string
        pesquisa?: string
        classeId?: string
        estado?: S['EstadoEstudante']
        page?: number
        pageSize?: number
      }
      ok: S['PaginaEstudanteDto']
    }>
  }
  '/estudantes/duplicados': {
    get: Op<{ query: { nome: string; dataNascimento?: string }; ok: S['EstudanteResumoDto'][] }>
  }
  '/estudantes/{id}': {
    get: Op<{ path: { id: string }; ok: S['EstudanteDto']; erros: 404 }>
    patch: Op<{
      path: { id: string }
      header: { 'If-Match'?: string }
      body: S['EstudanteAlteracaoDto']
      ok: S['EstudanteDto']
      erros: 403 | 404 | 412 | 422
    }>
  }
  '/estudantes/{id}/percurso': { get: Op<{ path: { id: string }; ok: S['EventoPercursoDto'][] }> }
  '/estudantes/{id}/documentos': { get: Op<{ path: { id: string }; ok: S['DocumentoEstudanteDto'][] }> }
  '/estudantes/{id}/documentos/{documentoId}': {
    patch: Op<{
      path: { id: string; documentoId: string }
      body: { estado: S['EstadoDocumentoEstudante'] }
      ok: S['DocumentoEstudanteDto']
      erros: 403 | 409
    }>
  }
  '/estudantes/{id}/encarregados': { get: Op<{ path: { id: string }; ok: S['EncarregadoDto'][] }> }

  // Matrículas
  '/matriculas': {
    get: Op<{
      query: {
        anoLectivoId: string
        classeId?: string
        estado?: S['EstadoMatricula']
        semTurma?: boolean
        page?: number
        pageSize?: number
      }
      ok: S['PaginaMatriculaDto']
    }>
    post: Op<{
      header: { 'Idempotency-Key': string }
      body: S['NovaMatriculaDto']
      ok: S['MatriculaDto']
      erros: 403 | 409 | 422
    }>
  }

  // Turmas e inscrições
  '/turmas': {
    get: Op<{
      query: {
        anoLectivoId: string
        classeId?: string
        turno?: S['Turno']
        estado?: S['EstadoTurma']
        page?: number
        pageSize?: number
      }
      ok: S['PaginaTurmaDto']
    }>
  }
  '/turmas/{id}': { get: Op<{ path: { id: string }; ok: S['TurmaDto']; erros: 404 }> }
  '/turmas/{id}/inscritos': { get: Op<{ path: { id: string }; ok: S['InscritoDto'][] }> }
  '/turmas/{id}/inscricoes': {
    post: Op<{ path: { id: string }; body: S['InscreverDto']; ok: S['InscritoDto']; erros: 403 | 409 }>
  }
  '/inscricoes/{matriculaId}/mover': {
    post: Op<{
      path: { matriculaId: string }
      body: S['MoverInscricaoDto']
      ok: S['InscritoDto']
      erros: 403 | 409
    }>
  }
  '/turmas/{id}/lista-nominal': {
    post: Op<{ path: { id: string }; header: { 'Idempotency-Key': string }; ok: S['TarefaDto'] }>
  }

  // Tarefas assíncronas
  '/tarefas/{id}': { get: Op<{ path: { id: string }; ok: S['TarefaDto']; erros: 404 }> }
}

export interface components {
  schemas: {
    VazioDto: Record<string, never>

    // Sessão
    LoginDto: { email: string; palavraPasse: string }
    TokenDto: { accessToken: string }
    SessaoDto: { accessToken: string; utilizador: components['schemas']['MeDto'] }
    MeDto: { id: string; nome: string; email: string; permissoes: string[] }

    // Referência
    Turno: 'MANHA' | 'TARDE' | 'NOITE'
    EstadoTurma: 'ACTIVA' | 'ENCERRADA'
    EstadoAnoLectivo: 'PLANEADO' | 'EM_CURSO' | 'ENCERRADO'
    AnoLectivoDto: {
      id: string
      designacao: string
      /** Formato: date (AAAA-MM-DD) */
      dataInicio: string
      /** Formato: date (AAAA-MM-DD) */
      dataFim: string
      estado: components['schemas']['EstadoAnoLectivo']
    }
    ClasseDto: { id: string; designacao: string; cicloDesignacao: string; ordem: number }

    // Turmas
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
    PaginaTurmaDto: Pagina<components['schemas']['TurmaDto']>
    InscritoDto: {
      matriculaId: string
      estudanteId: string
      turmaId: string
      nome: string
      numeroProcesso: string
      fotografiaUrl: string | null
    }
    InscreverDto: { matriculaId: string; excepcaoJustificacao?: string }
    MoverInscricaoDto: { turmaDestinoId: string; motivo: string; excepcaoJustificacao?: string }

    // Estudantes
    EstadoEstudante: 'ACTIVO' | 'TRANSFERIDO' | 'DESISTENTE' | 'CONCLUIDO' | 'ANULADO'
    EstudanteResumoDto: {
      id: string
      numeroProcesso: string
      nome: string
      /** Formato: date */
      dataNascimento: string
      fotografiaUrl: string | null
      estado: components['schemas']['EstadoEstudante']
      matriculaActual: {
        id: string
        classeDesignacao: string
        turmaDesignacao: string | null
        estado: components['schemas']['EstadoMatricula']
      } | null
      documentosEmFalta: number
    }
    EstudanteDto: components['schemas']['EstudanteResumoDto'] & {
      sexo: 'M' | 'F'
      documentoIdentificacao: string | null
      telefone: string | null
      morada: string | null
      naturalidade: string | null
    }
    EstudanteAlteracaoDto: { nome?: string; telefone?: string | null; morada?: string | null }
    PaginaEstudanteDto: Pagina<components['schemas']['EstudanteResumoDto']>
    TipoEventoPercurso: 'MATRICULA' | 'INSCRICAO' | 'MUDANCA_TURMA' | 'TRANSFERENCIA' | 'RESULTADO' | 'RECTIFICACAO'
    EventoPercursoDto: {
      id: string
      /** Formato: date-time */
      data: string
      anoLectivo: string
      tipo: components['schemas']['TipoEventoPercurso']
      descricao: string
      autor: string
      rectificaId: string | null
    }
    EstadoDocumentoEstudante: 'ENTREGUE' | 'EM_FALTA' | 'DISPENSADO'
    DocumentoEstudanteDto: {
      id: string
      tipo: string
      designacao: string
      obrigatorio: boolean
      estado: components['schemas']['EstadoDocumentoEstudante']
    }
    EncarregadoDto: {
      id: string
      nome: string
      parentesco: string
      telefone: string
      email: string | null
      principal: boolean
      /** Outros estudantes a cargo (irmãos) */
      outrosEducandos: number
    }

    // Matrículas
    EstadoMatricula: 'PENDENTE' | 'CONFIRMADA' | 'ANULADA' | 'CONCLUIDA'
    MatriculaDto: {
      id: string
      estudanteId: string
      estudanteNome: string
      numeroProcesso: string
      anoLectivoId: string
      classeId: string
      classeDesignacao: string
      turmaId: string | null
      turmaDesignacao: string | null
      estado: components['schemas']['EstadoMatricula']
      documentosEmFalta: number
      /** Formato: date-time */
      criadaEm: string
    }
    PaginaMatriculaDto: Pagina<components['schemas']['MatriculaDto']>
    NovoEstudanteDto: {
      nome: string
      /** Formato: date */
      dataNascimento: string
      sexo: 'M' | 'F'
      documentoIdentificacao?: string
      telefone?: string
      morada?: string
      naturalidade?: string
    }
    NovoEncarregadoDto: { nome: string; parentesco: string; telefone: string; email?: string; principal: boolean }
    NovaMatriculaDto: {
      anoLectivoId: string
      classeId: string
      turmaId?: string
      /** Estudante já existente (renovação ou reingresso) */
      estudanteId?: string
      /** Estudante novo */
      estudante?: components['schemas']['NovoEstudanteDto']
      encarregados: components['schemas']['NovoEncarregadoDto'][]
      /** Tipos de documento entregues no acto */
      documentosEntregues: string[]
      /** Obrigatória quando se ignora um possível duplicado */
      duplicadoIgnoradoJustificacao?: string
    }

    // Tarefas
    TarefaDto: {
      id: string
      titulo: string
      estado: 'EM_CURSO' | 'CONCLUIDA' | 'FALHADA'
      /** 0–100 */
      progresso: number
      resultadoUrl: string | null
      erros: { linha: number; mensagem: string }[]
    }

    // Painel e pesquisa
    PainelDto: {
      matriculasPendentes: number
      documentosEmFalta: number
      estudantesSemTurma: number
      turmasCheias: number
    }
    PesquisaDto: {
      estudantes: components['schemas']['EstudanteResumoDto'][]
      turmas: components['schemas']['TurmaDto'][]
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

// ---------------------------------------------------------------------------
// Auxiliares da escrita à mão (não existem no ficheiro gerado)
// ---------------------------------------------------------------------------
type S = components['schemas']

interface Pagina<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type Cabecalhos = { [name: string]: unknown }
type Problema = { headers: Cabecalhos; content: { 'application/problem+json': S['ProblemaDto'] } }

type Campo<K extends string, V> = V extends object ? { [P in K]: V } : { [P in K]?: never }

type Op<
  D extends {
    query?: object
    path?: object
    header?: object
    body?: object
    ok: unknown
    erros?: number
  },
> = {
  parameters: Campo<'query', D['query']> &
    Campo<'header', D['header']> &
    Campo<'path', D['path']> & { cookie?: never }
  responses: { 200: { headers: Cabecalhos; content: { 'application/json': D['ok'] } } } & {
    [K in D['erros'] extends number ? D['erros'] : never]: Problema
  }
} & (D['body'] extends object
  ? { requestBody: { content: { 'application/json': D['body'] } } }
  : { requestBody?: never })
