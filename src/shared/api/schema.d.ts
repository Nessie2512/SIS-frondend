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
  }  /** Confirmar exige os documentos obrigatórios entregues (guia 2.4) */
  '/matriculas/{id}/confirmar': {
    post: Op<{ path: { id: string }; ok: S['MatriculaDto']; erros: 403 | 404 | 409 }>
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
  '/inscricoes/{matriculaId}': {
    /** Retira a matrícula da turma (desfazer uma inscrição) */
    delete: Op<{ path: { matriculaId: string }; ok: S['VazioDto']; erros: 403 | 404 | 409 }>
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

  // Professores
  '/professores': {
    get: Op<{
      query: {
        anoLectivoId: string
        pesquisa?: string
        estado?: S['EstadoProfessor']
        disciplinaId?: string
        page?: number
        pageSize?: number
      }
      ok: S['PaginaProfessorDto']
    }>
  }
  '/professores/{id}': {
    get: Op<{
      path: { id: string }
      query: { anoLectivoId: string }
      ok: S['ProfessorDto']
      erros: 404
    }>
  }
  '/professores/{id}/estado': {
    post: Op<{
      path: { id: string }
      body: S['AlterarEstadoProfessorDto']
      ok: S['EstadoProfessorDto']
      erros: 403 | 404 | 422
    }>
  }

  // Currículo
  '/disciplinas': {
    get: Op<{ ok: S['DisciplinaDto'][] }>
    post: Op<{ body: S['NovaDisciplinaDto']; ok: S['DisciplinaDto']; erros: 403 | 409 | 422 }>
  }
  '/disciplinas/{id}': {
    delete: Op<{ path: { id: string }; ok: S['VazioDto']; erros: 403 | 404 | 409 }>
  }
  '/disciplinas/{id}/estado': {
    post: Op<{
      path: { id: string }
      body: { estado: S['EstadoDisciplina'] }
      ok: S['DisciplinaDto']
      erros: 403 | 404
    }>
  }
  '/planos': { get: Op<{ query: { classeId: string }; ok: S['PlanoResumoDto'][] }> }
  '/planos/{id}': { get: Op<{ path: { id: string }; ok: S['PlanoDto']; erros: 404 }> }
  '/planos/{id}/linhas': {
    post: Op<{
      path: { id: string }
      header: { 'If-Match': string }
      body: S['LinhaPlanoAlteracaoDto'] & { disciplinaId: string }
      ok: S['PlanoDto']
      erros: 403 | 409 | 412 | 422
    }>
  }
  '/planos/{id}/linhas/{disciplinaId}': {
    patch: Op<{
      path: { id: string; disciplinaId: string }
      header: { 'If-Match': string }
      body: S['LinhaPlanoAlteracaoDto']
      ok: S['PlanoDto']
      erros: 403 | 409 | 412 | 422
    }>
    delete: Op<{
      path: { id: string; disciplinaId: string }
      header: { 'If-Match': string }
      ok: S['PlanoDto']
      erros: 403 | 409 | 412
    }>
  }
  /** Copia o plano para um rascunho novo (só a partir do vigente) */
  '/planos/{id}/nova-versao': {
    post: Op<{ path: { id: string }; ok: S['PlanoDto']; erros: 403 | 409 }>
  }
  /** Publicar é irreversível: o rascunho passa a vigente e o vigente anterior fica arquivado */
  '/planos/{id}/publicar': {
    post: Op<{
      path: { id: string }
      header: { 'If-Match': string }
      ok: S['PlanoDto']
      erros: 403 | 409 | 412 | 422
    }>
  }

  // Calendário do ano lectivo
  '/anos-lectivos/{id}/calendario': {
    get: Op<{ path: { id: string }; ok: S['CalendarioDto']; erros: 404 }>
  }
  '/anos-lectivos/{id}/eventos': {
    post: Op<{
      path: { id: string }
      body: S['NovoEventoDto']
      ok: S['EventoDto']
      erros: 403 | 409 | 422
    }>
  }
  '/eventos/{id}': {
    delete: Op<{ path: { id: string }; ok: S['VazioDto']; erros: 403 | 404 | 409 }>
  }

  // Vistas guardadas por utilizador (guia 7.1)
  '/vistas': {
    get: Op<{ query: { ecra: S['EcraVista'] }; ok: S['VistaDto'][] }>
    post: Op<{ body: S['NovaVistaDto']; ok: S['VistaDto']; erros: 409 | 422 }>
  }
  '/vistas/{id}': { delete: Op<{ path: { id: string }; ok: S['VazioDto']; erros: 404 }> }
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

    // Professores
    EstadoProfessor: 'ACTIVO' | 'LICENCA' | 'SUSPENSO' | 'DESLIGADO'
    DisciplinaResumoDto: { id: string; nome: string; sigla: string }
    ProfessorResumoDto: {
      id: string
      /** Número de agente: identificador imutável */
      numeroAgente: string
      nome: string
      estado: components['schemas']['EstadoProfessor']
      /** Disciplinas em que está habilitado */
      disciplinas: components['schemas']['DisciplinaResumoDto'][]
      /** Horas semanais atribuídas no ano lectivo pedido */
      cargaLectiva: number
      cargaMaxima: number
      telefone: string | null
      email: string | null
      fotografiaUrl: string | null
    }
    PaginaProfessorDto: Pagina<components['schemas']['ProfessorResumoDto']>
    AtribuicaoDto: {
      id: string
      turmaId: string
      turma: string
      classe: string
      disciplinaId: string
      disciplina: string
      horasSemanais: number
      /** Formato: date */
      desde: string
    }
    DocumentoProfessorDto: {
      tipo: string
      rotulo: string
      estado: 'ENTREGUE' | 'EM_FALTA'
    }
    ProfessorDto: components['schemas']['ProfessorResumoDto'] & {
      habilitacao: string
      /** Formato: date */
      dataAdmissao: string
      atribuicoes: components['schemas']['AtribuicaoDto'][]
      documentos: components['schemas']['DocumentoProfessorDto'][]
    }
    AlterarEstadoProfessorDto: {
      estado: components['schemas']['EstadoProfessor']
      motivo?: string
    }
    EstadoProfessorDto: { id: string; estado: components['schemas']['EstadoProfessor'] }

    // Currículo
    EstadoDisciplina: 'ACTIVA' | 'INACTIVA'
    DisciplinaDto: {
      id: string
      nome: string
      sigla: string
      estado: components['schemas']['EstadoDisciplina']
      /** Usada num plano ou numa habilitação: não se elimina, só se inactiva */
      emUso: boolean
    }

    NovaDisciplinaDto: { nome: string; sigla: string }
    EstadoPlano: 'RASCUNHO' | 'VIGENTE' | 'ARQUIVADO'
    PlanoResumoDto: {
      id: string
      classeId: string
      versao: number
      estado: components['schemas']['EstadoPlano']
      /** Formato: date */
      publicadoEm: string | null
      totalHoras: number
    }
    LinhaPlanoDto: {
      disciplinaId: string
      disciplina: string
      sigla: string
      horasSemanais: number
    }
    PlanoDto: components['schemas']['PlanoResumoDto'] & {
      linhas: components['schemas']['LinhaPlanoDto'][]
      /** Versão para If-Match (ETag) */
      revisao: string
    }
    LinhaPlanoAlteracaoDto: { horasSemanais: number }

    // Calendário
    TipoEvento: 'FERIADO' | 'DATA_CHAVE' | 'INTERRUPCAO' | 'EVENTO'
    TrimestreDto: {
      numero: number
      /** Formato: date */
      inicio: string
      /** Formato: date */
      fim: string
    }
    EventoDto: {
      id: string
      titulo: string
      tipo: components['schemas']['TipoEvento']
      /** Formato: date */
      inicio: string
      /** Formato: date; igual ao início num evento de um dia */
      fim: string
      /** Feriados nacionais: vêm da lei e não se apagam */
      fixo: boolean
    }
    CalendarioDto: {
      anoLectivoId: string
      trimestres: components['schemas']['TrimestreDto'][]
      eventos: components['schemas']['EventoDto'][]
    }
    NovoEventoDto: {
      titulo: string
      tipo: Exclude<components['schemas']['TipoEvento'], 'FERIADO'>
      /** Formato: date */
      inicio: string
      /** Formato: date */
      fim: string
    }

    // Vistas guardadas
    EcraVista: 'estudantes' | 'matriculas' | 'professores'
    /** Filtros da lista, tal como vivem no URL (sem página nem selecção) */
    FiltrosVistaDto: { [chave: string]: string | number | boolean }
    VistaDto: {
      id: string
      ecra: components['schemas']['EcraVista']
      nome: string
      filtros: components['schemas']['FiltrosVistaDto']
    }
    NovaVistaDto: {
      ecra: components['schemas']['EcraVista']
      nome: string
      filtros: components['schemas']['FiltrosVistaDto']
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
