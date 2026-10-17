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
  '/anos-lectivos': {
    get: Op<{ ok: S['AnoLectivoDto'][] }>
    /** Cria o ano seguinte como PLANEADO, com trimestres e calendário gerados */
    post: Op<{ body: S['NovoAnoLectivoDto']; ok: S['AnoLectivoDto']; erros: 403 | 409 | 422 }>
  }
  '/anos-lectivos/{id}/encerramento': {
    get: Op<{ path: { id: string }; ok: S['EncerramentoDto']; erros: 404 }>
  }
  '/anos-lectivos/{id}/encerrar': {
    post: Op<{
      path: { id: string }
      body: S['EncerrarAnoDto']
      ok: S['AnoLectivoDto']
      erros: 403 | 404 | 409 | 422
    }>
  }
  '/anos-lectivos/{id}/reabrir': {
    post: Op<{
      path: { id: string }
      body: S['ReabrirAnoDto']
      ok: S['AnoLectivoDto']
      erros: 403 | 404 | 409 | 422
    }>
  }
  '/anos-lectivos/{id}/abertura': {
    get: Op<{ path: { id: string }; ok: S['AberturaDto']; erros: 404 }>
  }
  '/anos-lectivos/{id}/duplicar-turmas': {
    post: Op<{ path: { id: string }; ok: S['DuplicarTurmasDto']; erros: 403 | 404 | 409 }>
  }
  '/anos-lectivos/{id}/activar': {
    post: Op<{ path: { id: string }; ok: S['AnoLectivoDto']; erros: 403 | 404 | 409 }>
  }
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
  /** A entrada original nunca muda: a rectificação é uma entrada nova ligada a ela (guia 2.4) */
  '/estudantes/{id}/percurso/{eventoId}/rectificar': {
    post: Op<{
      path: { id: string; eventoId: string }
      body: S['RectificacaoDto']
      ok: S['EventoPercursoDto']
      erros: 403 | 404 | 409 | 422
    }>
  }
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
  '/estudantes/{id}/ocorrencias': {
    get: Op<{ path: { id: string }; ok: S['OcorrenciaDto'][] }>
    post: Op<{
      path: { id: string }
      body: S['NovaOcorrenciaDto']
      ok: S['OcorrenciaDto']
      erros: 403 | 404 | 409 | 422
    }>
  }

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
  }  /** Confirmar em lote: confirma as que podem e diz porque recusou as outras */
  '/matriculas/confirmar': {
    post: Op<{
      header: { 'Idempotency-Key': string }
      body: { ids: string[] }
      ok: S['ResultadoLoteDto']
      erros: 403 | 409 | 422
    }>
  }
  /** Confirmar exige os documentos obrigatórios entregues (guia 2.4) */
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

  // Relatórios (guia 2.5: catálogo e exportações; correm como tarefas longas)
  '/relatorios': { get: Op<{ ok: S['RelatorioDto'][] }> }
  '/relatorios/exportacoes': {
    get: Op<{ query: { anoLectivoId: string }; ok: S['ExportacaoDto'][] }>
  }
  '/relatorios/{tipo}': {
    post: Op<{
      path: { tipo: S['TipoRelatorio'] }
      header: { 'Idempotency-Key': string }
      body: S['PedidoRelatorioDto']
      ok: S['TarefaDto']
      erros: 404 | 422
    }>
  }

  // Resultados finais (guia 2.3: registar antes de encerrar o ano)
  '/turmas/{id}/resultados': {
    get: Op<{ path: { id: string }; ok: S['ResultadoFinalDto'][]; erros: 404 }>
    put: Op<{
      path: { id: string }
      body: S['RegistarResultadosDto']
      ok: S['ResultadoFinalDto'][]
      erros: 403 | 404 | 409 | 422
    }>
  }

  // Renovação de matrículas em lote (guia 2.3: simular, rever, confirmar, acompanhar)
  '/renovacoes/simular': {
    post: Op<{
      body: S['SimularRenovacaoDto']
      ok: S['SimulacaoRenovacaoDto']
      erros: 403 | 404 | 409
    }>
  }
  '/renovacoes/{id}/aplicar': {
    post: Op<{
      path: { id: string }
      header: { 'Idempotency-Key': string }
      body: S['AplicarRenovacaoDto']
      ok: S['TarefaDto']
      erros: 403 | 404 | 409
    }>
  }

  // Anular matrícula e mudar a situação do estudante (guia 2.2)
  '/matriculas/{id}/anular': {
    post: Op<{
      path: { id: string }
      body: S['MotivoDto']
      ok: S['MatriculaDto']
      erros: 403 | 404 | 409 | 422
    }>
  }
  '/estudantes/{id}/situacao': {
    post: Op<{
      path: { id: string }
      body: S['MudarSituacaoDto']
      ok: S['EstudanteDto']
      erros: 403 | 404 | 409 | 422
    }>
  }

  // Transferência de saída (guia 2.3)
  '/estudantes/{id}/transferir': {
    post: Op<{
      path: { id: string }
      body: S['TransferirEstudanteDto']
      ok: S['EstudanteDto']
      erros: 403 | 404 | 409 | 422
    }>
  }

  // Documentos oficiais (guia 2.1, 2.3: emitir com pré-visualização; anular com motivo)
  '/estudantes/{id}/documentos-oficiais': {
    get: Op<{ path: { id: string }; ok: S['DocumentosOficiaisDto']; erros: 404 }>
    post: Op<{
      path: { id: string }
      header: { 'Idempotency-Key': string }
      body: S['PedidoDocumentoOficialDto']
      ok: S['DocumentoOficialDto']
      erros: 403 | 404 | 422
    }>
  }
  '/estudantes/{id}/documentos-oficiais/pre-visualizar': {
    post: Op<{
      path: { id: string }
      body: S['PedidoDocumentoOficialDto']
      ok: S['ConteudoDocumentoDto']
      erros: 403 | 404 | 422
    }>
  }
  '/documentos-oficiais/{id}/anular': {
    post: Op<{
      path: { id: string }
      body: S['AnularDocumentoDto']
      ok: S['DocumentoOficialDto']
      erros: 403 | 404 | 409 | 422
    }>
  }

  // Docentes da turma (guia 2.3: atribuir e substituir)
  '/turmas/{id}/docentes': {
    get: Op<{ path: { id: string }; ok: S['DocenteTurmaDto'][]; erros: 404 }>
    post: Op<{
      path: { id: string }
      body: S['AtribuirDocenteDto']
      ok: S['DocenteTurmaDto']
      erros: 403 | 404 | 409 | 422
    }>
  }

  // Administração (guia 2.5: utilizadores, perfis, auditoria)
  '/utilizadores': {
    get: Op<{
      query: { pesquisa?: string; perfilId?: string; estado?: S['EstadoUtilizador'] }
      ok: S['UtilizadorDto'][]
    }>
  }
  '/utilizadores/{id}/estado': {
    post: Op<{
      path: { id: string }
      body: { estado: S['EstadoUtilizador'] }
      ok: S['UtilizadorDto']
      erros: 403 | 404 | 409
    }>
  }
  '/perfis': { get: Op<{ ok: S['PerfilDto'][] }> }
  '/auditoria': {
    get: Op<{
      query: {
        pesquisa?: string
        accao?: S['AccaoAuditoria']
        page?: number
        pageSize?: number
      }
      ok: S['PaginaAuditoriaDto']
    }>
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
    NovoAnoLectivoDto: {
      /** Formato: date */
      dataInicio: string
      /** Formato: date */
      dataFim: string
    }
    TipoPendencia: 'MATRICULAS_PENDENTES' | 'CONFIRMADAS_SEM_TURMA' | 'RESULTADOS_EM_FALTA'
    EncerramentoDto: {
      anoLectivoId: string
      pendencias: {
        tipo: components['schemas']['TipoPendencia']
        quantidade: number
        bloqueante: boolean
      }[]
      turmasSemResultados: { turmaId: string; designacao: string; total: number; emFalta: number }[]
      podeEncerrar: boolean
    }
    /** O texto tem de ser a designação do ano (confirmação digitada, guia 2.3) */
    EncerrarAnoDto: { confirmacao: string }
    ReabrirAnoDto: { motivo: string }
    EtapaAbertura:
      | 'CRIAR'
      | 'CALENDARIO'
      | 'TURMAS'
      | 'RENOVACAO'
      | 'MATRICULAS'
      | 'DISTRIBUICAO'
      | 'DOCENTES'
      | 'ACTIVAR'
    EstadoEtapa: 'FEITA' | 'POR_FAZER' | 'OPCIONAL' | 'BLOQUEADA'
    EtapaAberturaDto: {
      id: components['schemas']['EtapaAbertura']
      estado: components['schemas']['EstadoEtapa']
      /** Contagem que a etapa mostra (trimestres, turmas, sem turma, sem docente…) */
      quantidade: number | null
    }
    AberturaDto: {
      anoLectivoId: string
      etapas: components['schemas']['EtapaAberturaDto'][]
      /** Designação do ano ainda em curso, que impede activar este */
      anoEmCurso: string | null
    }
    DuplicarTurmasDto: { criadas: number; origem: string }
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
        turmaId: string | null
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
    TipoEventoPercurso:
      | 'MATRICULA'
      | 'INSCRICAO'
      | 'MUDANCA_TURMA'
      | 'TRANSFERENCIA'
      | 'RESULTADO'
      | 'RECTIFICACAO'
      | 'SITUACAO'
    EventoPercursoDto: {
      id: string
      /** Formato: date-time */
      data: string
      anoLectivo: string
      tipo: components['schemas']['TipoEventoPercurso']
      descricao: string
      autor: string
      /** Numa rectificação: a entrada original (que se mantém) */
      rectificaId: string | null
      /** Numa rectificação: porque se rectificou */
      motivo: string | null
    }
    RectificacaoDto: { descricao: string; motivo: string }
    TipoOcorrencia: 'DISCIPLINAR' | 'SAUDE' | 'PEDAGOGICA' | 'OUTRA'
    OcorrenciaDto: {
      id: string
      /** Formato: date — quando aconteceu */
      data: string
      tipo: components['schemas']['TipoOcorrencia']
      descricao: string
      autor: string
      /** Formato: date-time — quando foi registada */
      registadaEm: string
    }
    NovaOcorrenciaDto: {
      /** Formato: date */
      data: string
      tipo: components['schemas']['TipoOcorrencia']
      descricao: string
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
    ResultadoLoteDto: {
      confirmadas: components['schemas']['MatriculaDto'][]
      recusadas: { id: string; estudanteNome: string; motivo: string }[]
    }
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
      /** Transferência de entrada: escola de origem e classes lá concluídas (guia 2.3) */
      transferenciaEntrada?: { escolaOrigem: string; classesConcluidas: string[] }
    }
    MotivoDto: { motivo: string }
    /** Desistência (ACTIVO→DESISTENTE), reingresso (DESISTENTE→ACTIVO), anulação (ACTIVO→ANULADO) */
    AccaoSituacao: 'DESISTENCIA' | 'REINGRESSO' | 'ANULACAO'
    MudarSituacaoDto: {
      accao: components['schemas']['AccaoSituacao']
      /** Formato: date */
      data: string
      motivo: string
    }
    TransferirEstudanteDto: {
      escolaDestino: string
      /** Formato: date */
      data: string
      motivo?: string
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

    // Relatórios
    TipoRelatorio:
      | 'LISTA_NOMINAL'
      | 'MATRICULAS_POR_CLASSE'
      | 'DOCUMENTOS_EM_FALTA'
      | 'SEM_TURMA'
      | 'OCUPACAO_TURMAS'
      | 'CARGA_LECTIVA'
    RelatorioDto: {
      tipo: components['schemas']['TipoRelatorio']
      titulo: string
      descricao: string
      /** Parâmetro a escolher antes de gerar */
      parametro: 'TURMA' | 'CLASSE' | null
      parametroObrigatorio: boolean
      formato: 'CSV'
    }
    PedidoRelatorioDto: { anoLectivoId: string; turmaId?: string; classeId?: string }
    ExportacaoDto: {
      /** Id da tarefa */
      id: string
      tipo: components['schemas']['TipoRelatorio']
      titulo: string
      /** Formato: date-time */
      pedidoEm: string
      estado: components['schemas']['TarefaDto']['estado']
      progresso: number
      resultadoUrl: string | null
    }

    // Resultados finais
    ResultadoFinal: 'APROVADO' | 'REPROVADO'
    ResultadoFinalDto: {
      matriculaId: string
      estudanteId: string
      nome: string
      numeroProcesso: string
      resultado: components['schemas']['ResultadoFinal'] | null
    }
    RegistarResultadosDto: {
      resultados: {
        matriculaId: string
        resultado: components['schemas']['ResultadoFinal'] | null
      }[]
    }

    // Renovação
    SimularRenovacaoDto: { anoDestinoId: string }
    MotivoExclusao: 'SEM_RESULTADO' | 'FIM_DE_CICLO' | 'JA_MATRICULADO' | 'ESTUDANTE_INACTIVO'
    SimulacaoRenovacaoDto: {
      id: string
      anoOrigemId: string
      anoOrigem: string
      anoDestinoId: string
      anoDestino: string
      /** Por classe de destino */
      resumo: { classeId: string; classe: string; total: number; sobem: number; repetem: number }[]
      incluidos: {
        matriculaId: string
        estudanteId: string
        nome: string
        numeroProcesso: string
        classeActual: string
        resultado: components['schemas']['ResultadoFinal']
        classeDestinoId: string
        classeDestino: string
      }[]
      excluidos: {
        matriculaId: string
        estudanteId: string
        nome: string
        numeroProcesso: string
        classeActual: string
        motivo: components['schemas']['MotivoExclusao']
      }[]
    }
    /** Matrículas incluídas na simulação que o utilizador retirou à mão */
    AplicarRenovacaoDto: { excluir: string[] }

    // Documentos oficiais
    TipoDocumentoOficial:
      | 'DECLARACAO_MATRICULA'
      | 'DECLARACAO_FREQUENCIA'
      | 'GUIA_TRANSFERENCIA'
      | 'CERTIFICADO_HABILITACOES'
    TipoDisponivelDto: {
      tipo: components['schemas']['TipoDocumentoOficial']
      titulo: string
      disponivel: boolean
      /** Porque não se pode emitir agora (guia 2.7: desactivar com a razão) */
      razao: string | null
    }
    DocumentoOficialDto: {
      id: string
      tipo: components['schemas']['TipoDocumentoOficial']
      titulo: string
      numero: string
      codigoVerificacao: string
      /** Formato: date-time */
      emitidoEm: string
      emitidoPor: string
      finalidade: string | null
      estado: 'VALIDO' | 'ANULADO'
      motivoAnulacao: string | null
      pdfUrl: string
    }
    DocumentosOficiaisDto: {
      tipos: components['schemas']['TipoDisponivelDto'][]
      emitidos: components['schemas']['DocumentoOficialDto'][]
    }
    PedidoDocumentoOficialDto: {
      tipo: components['schemas']['TipoDocumentoOficial']
      /** «Para efeitos de…» (opcional) */
      finalidade?: string
    }
    ConteudoDocumentoDto: { titulo: string; paragrafos: string[] }
    AnularDocumentoDto: { motivo: string }

    // Docentes da turma
    DocenteTurmaDto: {
      disciplinaId: string
      disciplina: string
      sigla: string
      horasSemanais: number
      actual: {
        atribuicaoId: string
        professorId: string
        professor: string
        /** Formato: date */
        desde: string
      } | null
      /** Atribuições terminadas, da mais recente para a mais antiga */
      historico: {
        professor: string
        /** Formato: date */
        desde: string
        /** Formato: date */
        ate: string
        motivo: string
      }[]
    }
    AtribuirDocenteDto: {
      disciplinaId: string
      professorId: string
      /** Formato: date. Na substituição, quando o novo docente começa (a anterior termina aí) */
      desde?: string
      /** Obrigatório quando substitui */
      motivo?: string
    }

    // Administração
    EstadoUtilizador: 'ACTIVO' | 'INACTIVO'
    UtilizadorDto: {
      id: string
      nome: string
      email: string
      perfilId: string
      perfil: string
      estado: components['schemas']['EstadoUtilizador']
      /** Formato: date-time */
      ultimoAcesso: string | null
    }
    PerfilDto: {
      id: string
      nome: string
      descricao: string
      permissoes: string[]
      utilizadores: number
    }
    AccaoAuditoria: 'CRIAR' | 'ALTERAR' | 'CONFIRMAR' | 'PUBLICAR' | 'RECTIFICAR' | 'ENTRAR'
    EntradaAuditoriaDto: {
      id: string
      /** Formato: date-time */
      quando: string
      utilizador: string
      accao: components['schemas']['AccaoAuditoria']
      recurso: string
      detalhe: string
    }
    PaginaAuditoriaDto: Pagina<components['schemas']['EntradaAuditoriaDto']>

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
