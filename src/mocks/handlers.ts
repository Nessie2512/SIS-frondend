import { http, HttpResponse } from 'msw'
import {
  anosLectivos,
  classePorId,
  classes,
  contarInscritos,
  db,
  matriculaDe,
  normalizar,
  novoId,
  paraEncarregadoDto,
  paraEstudanteDto,
  paraEstudanteResumo,
  paraInscritoDto,
  paraMatriculaDto,
  paraTarefaDto,
  paraTurmaDto,
  TIPOS_DOCUMENTO,
  TIPOS_DOCUMENTO_OBRIGATORIOS,
  turmaPorId,
  UTILIZADORES,
  type Tarefa,
} from './db'

import {
  hojeEmAngola,
  anoEncerrado,
  API,
  etag,
  idempotente,
  latencia,
  paginar,
  problema,
  protegido,
  utilizadorDo,
  type S,
} from './apoio'
import { handlersAcademicos } from './handlers-academicos'
import { administracao, auditar, handlersAdministracao } from './administracao'
import { handlersAnos } from './anos'
import { handlersRenovacoes } from './renovacoes'
import { handlersDistribuicao } from './distribuicao'
import { handlersImportacoes } from './importacoes'
import { handlersClasses } from './classes'
import { handlersDocumentosOficiais, pdfDoLote } from './documentos-oficiais'
import { gerarCsv, handlersRelatorios } from './relatorios'

/** Os mesmos handlers servem desenvolvimento, testes e Storybook (guia 3.2). */
export const handlers = [
  // ---------------------------------------------------------------- sessão
  http.post(`${API}/auth/login`, async ({ request }) => {
    await latencia(400)
    const { email, palavraPasse } = (await request.json()) as S['LoginDto']
    const utilizador = UTILIZADORES.find(
      (u) => u.email === email.trim().toLowerCase() && u.palavraPasse === palavraPasse,
    )
    if (!utilizador)
      return problema(401, 'Credenciais inválidas', { code: 'CREDENCIAIS_INVALIDAS' })
    const conta = administracao.utilizadores.find((u) => u.id === utilizador.id)
    if (conta?.estado === 'INACTIVO') {
      return problema(403, 'Conta inactiva', {
        detail: 'Esta conta foi desactivada. Fale com a administração da escola.',
      })
    }
    const { palavraPasse: _, ...me } = utilizador
    auditar(me.nome, 'ENTRAR', 'Sessão', 'Entrada na aplicação')
    return HttpResponse.json(
      { accessToken: `tk-${utilizador.id}`, utilizador: me },
      { headers: { 'Set-Cookie': `sessao=${utilizador.id}; Path=/` } },
    )
  }),

  http.post(`${API}/auth/refresh`, async ({ cookies }) => {
    await latencia(150)
    const utilizador = UTILIZADORES.find((u) => u.id === cookies.sessao)
    if (!utilizador) return problema(401, 'Sem sessão')
    return HttpResponse.json({ accessToken: `tk-${utilizador.id}` })
  }),

  http.post(`${API}/auth/logout`, () =>
    HttpResponse.json({}, { headers: { 'Set-Cookie': 'sessao=; Path=/; Max-Age=0' } }),
  ),

  http.get(
    `${API}/auth/me`,
    protegido(null, ({ request }) => {
      const { palavraPasse: _, ...me } = utilizadorDo(request)!
      return HttpResponse.json(me)
    }),
  ),

  // ---------------------------------------------------------------- referência
  http.get(
    `${API}/anos-lectivos`,
    protegido(null, () => HttpResponse.json(anosLectivos)),
  ),
  http.get(
    `${API}/classes`,
    protegido(null, () => HttpResponse.json(classes)),
  ),

  // ---------------------------------------------------------------- painel e pesquisa
  http.get(
    `${API}/painel`,
    protegido(null, ({ request }) => {
      const anoLectivoId = new URL(request.url).searchParams.get('anoLectivoId')
      const doAno = db.matriculas.filter(
        (m) => m.anoLectivoId === anoLectivoId && m.estado !== 'ANULADA',
      )
      return HttpResponse.json({
        matriculasPendentes: doAno.filter((m) => m.estado === 'PENDENTE').length,
        documentosEmFalta: db.documentos.filter(
          (d) =>
            d.obrigatorio &&
            d.estado === 'EM_FALTA' &&
            doAno.some((m) => m.estudanteId === d.estudanteId),
        ).length,
        estudantesSemTurma: doAno.filter((m) => !m.turmaId).length,
        turmasCheias: db.turmas.filter(
          (t) => t.anoLectivoId === anoLectivoId && contarInscritos(t.id) >= t.lotacaoMaxima,
        ).length,
      } satisfies S['PainelDto'])
    }),
  ),

  http.get(
    `${API}/pesquisa`,
    protegido(null, ({ request }) => {
      const url = new URL(request.url)
      const q = normalizar(url.searchParams.get('q') ?? '')
      const anoLectivoId = url.searchParams.get('anoLectivoId') ?? 'ano-2026'
      if (q.length < 2) return HttpResponse.json({ estudantes: [], turmas: [] })
      const estudantes = db.estudantes
        .filter((e) => normalizar(e.nome).includes(q) || e.numeroProcesso.includes(q))
        .slice(0, 5)
        .map((e) => paraEstudanteResumo(e, anoLectivoId))
      const turmas = db.turmas
        .filter((t) => t.anoLectivoId === anoLectivoId && normalizar(t.designacao).includes(q))
        .slice(0, 5)
        .map(paraTurmaDto)
      return HttpResponse.json({ estudantes, turmas } satisfies S['PesquisaDto'])
    }),
  ),

  // ---------------------------------------------------------------- estudantes
  http.get(
    `${API}/estudantes`,
    protegido('estudantes:ler', ({ request }) => {
      const url = new URL(request.url)
      const anoLectivoId = url.searchParams.get('anoLectivoId') ?? 'ano-2026'
      const pesquisa = normalizar(url.searchParams.get('pesquisa') ?? '')
      const classeId = url.searchParams.get('classeId')
      const estado = url.searchParams.get('estado')
      const semTurma = url.searchParams.get('semTurma') === 'true'
      const comDocumentosEmFalta = url.searchParams.get('documentosEmFalta') === 'true'
      const sexo = url.searchParams.get('sexo')
      const lista = db.estudantes
        .filter((e) => {
          const m = matriculaDe(e.id, anoLectivoId)
          return (
            (!pesquisa ||
              normalizar(e.nome).includes(pesquisa) ||
              e.numeroProcesso.includes(pesquisa)) &&
            (!classeId || m?.classeId === classeId) &&
            (!estado || e.estado === estado) &&
            (!semTurma || (m && !m.turmaId)) &&
            (!comDocumentosEmFalta ||
              db.documentos.some(
                (d) => d.estudanteId === e.id && d.obrigatorio && d.estado === 'EM_FALTA',
              )) &&
            (!sexo || e.sexo === sexo)
          )
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
        .map((e) => paraEstudanteResumo(e, anoLectivoId))
      return HttpResponse.json(paginar(lista, url))
    }),
  ),

  http.get(
    `${API}/estudantes/duplicados`,
    protegido('estudantes:ler', ({ request }) => {
      const url = new URL(request.url)
      const nome = normalizar(url.searchParams.get('nome') ?? '')
      const data = url.searchParams.get('dataNascimento')
      if (nome.length < 5) return HttpResponse.json([])
      const partes = nome.split(/\s+/).filter((p) => p.length > 2)
      const candidatos = db.estudantes
        .filter((e) => {
          const n = normalizar(e.nome)
          const coincidencias = partes.filter((p) => n.includes(p)).length
          // Nome igual basta; nome parecido só conta com a mesma data de nascimento
          const mesmoNome = n === nome
          const parecido = coincidencias >= Math.min(2, partes.length)
          return mesmoNome || (parecido && (!data || e.dataNascimento === data))
        })
        .slice(0, 3)
        .map((e) => paraEstudanteResumo(e))
      return HttpResponse.json(candidatos)
    }),
  ),

  http.get(
    `${API}/estudantes/:id`,
    protegido('estudantes:ler', ({ params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      return HttpResponse.json(paraEstudanteDto(e), { headers: { ETag: etag(e.versao) } })
    }),
  ),

  http.patch(
    `${API}/estudantes/:id`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      const versaoPedida = request.headers.get('If-Match')
      if (versaoPedida && versaoPedida !== etag(e.versao)) {
        return problema(412, 'Versão desactualizada', { code: 'VERSAO_DESACTUALIZADA' })
      }
      const alteracao = (await request.json()) as S['EstudanteAlteracaoDto']
      if (alteracao.telefone && !/^9\d{8}$/.test(alteracao.telefone.replace(/\s/g, ''))) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'telefone', mensagem: 'O telefone tem 9 dígitos e começa por 9.' }],
        })
      }
      if (alteracao.nome !== undefined && alteracao.nome.trim().split(/\s+/).length < 2) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'nome', mensagem: 'Escreva o nome completo.' }],
        })
      }
      Object.assign(e, {
        ...alteracao,
        telefone:
          alteracao.telefone === undefined
            ? e.telefone
            : alteracao.telefone?.replace(/\s/g, '') || null,
      })
      e.versao++
      return HttpResponse.json(paraEstudanteDto(e), { headers: { ETag: etag(e.versao) } })
    }),
  ),

  http.get(
    `${API}/estudantes/:id/percurso`,
    protegido('estudantes:ler', ({ params }) =>
      HttpResponse.json(
        db.percurso
          .filter((p) => p.estudanteId === params.id)
          .map(({ estudanteId: _, ...p }) => p)
          .sort((a, b) => b.data.localeCompare(a.data)),
      ),
    ),
  ),

  http.post(
    `${API}/estudantes/:id/percurso/:eventoId/rectificar`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const original = db.percurso.find(
        (p) => p.estudanteId === params.id && p.id === params.eventoId,
      )
      if (!original) return problema(404, 'Registo não encontrado')
      if (original.tipo === 'RECTIFICACAO') {
        return problema(409, 'Rectificação', {
          detail: 'Uma rectificação não se rectifica; rectifique a entrada original.',
        })
      }
      const corpo = (await request.json()) as S['RectificacaoDto']
      const descricao = corpo.descricao?.trim() ?? ''
      const motivo = corpo.motivo?.trim() ?? ''
      const erros = [
        ...(descricao.length < 3
          ? [{ campo: 'descricao', mensagem: 'Escreva o registo correcto.' }]
          : []),
        ...(motivo.length < 10
          ? [{ campo: 'motivo', mensagem: 'Explique o motivo (pelo menos 10 caracteres).' }]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const rectificacao = {
        id: novoId('p'),
        estudanteId: original.estudanteId,
        data: new Date().toISOString(),
        anoLectivo: original.anoLectivo,
        tipo: 'RECTIFICACAO' as const,
        descricao,
        autor: utilizadorDo(request)!.nome,
        rectificaId: original.id,
        motivo,
      }
      db.percurso.push(rectificacao)
      auditar(rectificacao.autor, 'RECTIFICAR', 'Percurso', `${original.descricao} → ${descricao}`)
      const { estudanteId: _, ...dto } = rectificacao
      return HttpResponse.json(dto, { status: 201 })
    }),
  ),

  http.get(
    `${API}/estudantes/:id/documentos`,
    protegido('estudantes:ler', ({ params }) =>
      HttpResponse.json(
        db.documentos
          .filter((d) => d.estudanteId === params.id)
          .map(({ estudanteId: _, ...d }) => d),
      ),
    ),
  ),

  http.patch(
    `${API}/estudantes/:id/documentos/:documentoId`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const doc = db.documentos.find(
        (d) => d.estudanteId === params.id && d.id === params.documentoId,
      )
      if (!doc) return problema(404, 'Documento não encontrado')
      const { estado } = (await request.json()) as { estado: S['EstadoDocumentoEstudante'] }
      if (estado === 'DISPENSADO' && doc.obrigatorio) {
        return problema(409, 'Documento obrigatório', {
          detail: 'Um documento obrigatório não pode ser dispensado.',
          code: 'DOCUMENTO_OBRIGATORIO',
        })
      }
      doc.estado = estado
      const { estudanteId: _, ...dto } = doc
      return HttpResponse.json(dto)
    }),
  ),

  http.get(
    `${API}/estudantes/:id/ocorrencias`,
    protegido('estudantes:ler', ({ params }) =>
      HttpResponse.json(
        db.ocorrencias
          .filter((o) => o.estudanteId === params.id)
          .sort(
            (a, b) => b.data.localeCompare(a.data) || b.registadaEm.localeCompare(a.registadaEm),
          )
          .map(({ estudanteId: _, ...o }) => o) satisfies S['OcorrenciaDto'][],
      ),
    ),
  ),

  http.post(
    `${API}/estudantes/:id/ocorrencias`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      const corpo = (await request.json()) as S['NovaOcorrenciaDto']
      const descricao = corpo.descricao?.trim() ?? ''
      const hoje = hojeEmAngola()
      const erros = [
        ...(descricao.length < 10
          ? [
              {
                campo: 'descricao',
                mensagem: 'Descreva o que aconteceu (pelo menos 10 caracteres).',
              },
            ]
          : []),
        ...(!corpo.data || corpo.data > hoje
          ? [{ campo: 'data', mensagem: 'A data não pode ser no futuro.' }]
          : []),
        ...(!['DISCIPLINAR', 'SAUDE', 'PEDAGOGICA', 'OUTRA'].includes(corpo.tipo)
          ? [{ campo: 'tipo', mensagem: 'Escolha o tipo.' }]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const ocorrencia = {
        id: novoId('oc'),
        estudanteId: e.id,
        data: corpo.data,
        tipo: corpo.tipo,
        descricao,
        autor: utilizadorDo(request)!.nome,
        registadaEm: new Date().toISOString(),
      }
      db.ocorrencias.push(ocorrencia)
      auditar(ocorrencia.autor, 'CRIAR', 'Ocorrência', `${e.nome}: ${descricao.slice(0, 60)}`)
      const { estudanteId: _, ...dto } = ocorrencia
      return HttpResponse.json(dto satisfies S['OcorrenciaDto'], { status: 201 })
    }),
  ),

  http.get(
    `${API}/estudantes/:id/encarregados`,
    protegido('estudantes:ler', ({ params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      return HttpResponse.json(
        e.encarregadoIds.map((id, i) =>
          paraEncarregadoDto(
            db.encarregados.find((x) => x.id === id)!,
            e.id,
            i === 0,
          ),
        ),
      )
    }),
  ),

  http.get(
    `${API}/encarregados`,
    protegido('estudantes:ler', ({ request }) => {
      const pesquisa = normalizar(new URL(request.url).searchParams.get('pesquisa') ?? '')
      const digitos = pesquisa.replace(/\D/g, '')
      if (pesquisa.length < 2) return HttpResponse.json([])
      return HttpResponse.json(
        db.encarregados
          .filter(
            (x) =>
              normalizar(x.nome).includes(pesquisa) ||
              (digitos.length >= 3 && x.telefone.includes(digitos)),
          )
          .slice(0, 8)
          .map((x) => ({
            id: x.id,
            nome: x.nome,
            telefone: x.telefone,
            educandos: x.educandos
              .map((id) => db.estudantes.find((e) => e.id === id)?.nome)
              .filter((n): n is string => Boolean(n)),
          })) satisfies S['EncarregadoResumoDto'][],
      )
    }),
  ),

  http.post(
    `${API}/estudantes/:id/encarregados`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      const corpo = (await request.json()) as S['AcrescentarEncarregadoDto']
      let enc = corpo.encarregadoId
        ? db.encarregados.find((x) => x.id === corpo.encarregadoId)
        : undefined
      if (corpo.encarregadoId && !enc) return problema(404, 'Encarregado não encontrado')
      if (!enc) {
        const erros = validarEncarregado(corpo)
        if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
        const telefone = corpo.telefone!.replace(/\D/g, '')
        const existente = db.encarregados.find((x) => x.telefone === telefone)
        if (existente) {
          return problema(409, 'Encarregado existente', {
            code: 'ENCARREGADO_EXISTENTE',
            detail: `${existente.nome} já está registado com este telefone.`,
            encarregadoId: existente.id,
            nome: existente.nome,
          })
        }
        enc = {
          id: novoId('enc'),
          nome: corpo.nome!.trim(),
          parentesco: corpo.parentesco!.trim(),
          telefone,
          email: corpo.email?.trim() || null,
          educandos: [],
        }
        db.encarregados.push(enc)
      }
      if (e.encarregadoIds.includes(enc.id)) {
        return problema(409, 'Já ligado', {
          detail: 'Este encarregado já está ligado ao estudante.',
        })
      }
      enc.educandos.push(e.id)
      e.encarregadoIds[corpo.principal ? 'unshift' : 'push'](enc.id)
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Estudante',
        `${e.nome}: encarregado ${enc.nome} acrescentado`,
      )
      return HttpResponse.json(paraEncarregadoDto(enc, e.id, e.encarregadoIds[0] === enc.id), {
        status: 201,
      })
    }),
  ),

  http.put(
    `${API}/estudantes/:id/encarregados/:encarregadoId`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      const enc = db.encarregados.find((x) => x.id === params.encarregadoId)
      if (!e || !enc || !e.encarregadoIds.includes(enc.id)) {
        return problema(404, 'Encarregado não encontrado')
      }
      const corpo = (await request.json()) as S['AcrescentarEncarregadoDto']
      const erros = validarEncarregado(corpo)
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const telefone = corpo.telefone!.replace(/\D/g, '')
      if (db.encarregados.some((x) => x.id !== enc.id && x.telefone === telefone)) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'telefone', mensagem: 'Outro encarregado já usa este telefone.' }],
        })
      }
      enc.nome = corpo.nome!.trim()
      enc.parentesco = corpo.parentesco!.trim()
      enc.telefone = telefone
      enc.email = corpo.email?.trim() || null
      if (corpo.principal) {
        e.encarregadoIds = [enc.id, ...e.encarregadoIds.filter((x) => x !== enc.id)]
      }
      auditar(utilizadorDo(request)!.nome, 'ALTERAR', 'Encarregado', `${enc.nome}: dados alterados`)
      return HttpResponse.json(paraEncarregadoDto(enc, e.id, e.encarregadoIds[0] === enc.id))
    }),
  ),

  http.delete(
    `${API}/estudantes/:id/encarregados/:encarregadoId`,
    protegido('estudantes:escrever', ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      const enc = db.encarregados.find((x) => x.id === params.encarregadoId)
      if (!e || !enc || !e.encarregadoIds.includes(enc.id)) {
        return problema(404, 'Encarregado não encontrado')
      }
      if (e.encarregadoIds.length === 1) {
        return problema(409, 'Último encarregado', { code: 'ULTIMO_ENCARREGADO' })
      }
      e.encarregadoIds = e.encarregadoIds.filter((x) => x !== enc.id)
      enc.educandos = enc.educandos.filter((x) => x !== e.id)
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Estudante',
        `${e.nome}: encarregado ${enc.nome} retirado`,
      )
      return HttpResponse.json({})
    }),
  ),

  // ---------------------------------------------------------------- matrículas
  http.get(
    `${API}/matriculas`,
    protegido('matriculas:ler', ({ request }) => {
      const url = new URL(request.url)
      const anoLectivoId = url.searchParams.get('anoLectivoId')
      const classeId = url.searchParams.get('classeId')
      const estado = url.searchParams.get('estado')
      const semTurma = url.searchParams.get('semTurma') === 'true'
      const lista = db.matriculas
        .filter(
          (m) =>
            m.anoLectivoId === anoLectivoId &&
            m.estado !== 'ANULADA' &&
            (!classeId || m.classeId === classeId) &&
            (!estado || m.estado === estado) &&
            (!semTurma || !m.turmaId),
        )
        .map(paraMatriculaDto)
        .sort((a, b) => a.estudanteNome.localeCompare(b.estudanteNome, 'pt'))
      return HttpResponse.json(paginar(lista, url))
    }),
  ),

  http.post(
    `${API}/matriculas`,
    protegido('matriculas:escrever', async ({ request }) => {
      const dados = (await request.json()) as S['NovaMatriculaDto']
      return idempotente(request, () => {
        if (anoEncerrado(dados.anoLectivoId))
          return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
        const erros: S['ProblemaDto']['errors'] = []
        if (!dados.estudanteId && !dados.estudante)
          erros.push({ campo: 'estudante', mensagem: 'Indique o estudante.' })
        // Um estudante que já existe mantém os encarregados que tem
        if (!dados.estudanteId && !dados.encarregados.length)
          erros.push({ campo: 'encarregados', mensagem: 'Indique pelo menos um encarregado.' })
        if (!classes.some((c) => c.id === dados.classeId))
          erros.push({ campo: 'classeId', mensagem: 'Escolha a classe.' })
        if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })

        // Uma matrícula por estudante e ano (guia 2.4)
        if (dados.estudanteId) {
          const existente = matriculaDe(dados.estudanteId, dados.anoLectivoId)
          if (existente) {
            return problema(409, 'Matrícula duplicada', {
              code: 'MATRICULA_DUPLICADA',
              matriculaId: existente.id,
            })
          }
        }
        // Estudante sem duplicados, salvo decisão justificada
        if (dados.estudante && !dados.duplicadoIgnoradoJustificacao) {
          const nome = normalizar(dados.estudante.nome)
          const duplicado = db.estudantes.find(
            (e) =>
              normalizar(e.nome) === nome && e.dataNascimento === dados.estudante!.dataNascimento,
          )
          if (duplicado) {
            return problema(409, 'Possível duplicado', {
              code: 'ESTUDANTE_DUPLICADO',
              estudanteId: duplicado.id,
            })
          }
        }
        if (dados.turmaId) {
          const turma = turmaPorId(dados.turmaId)
          if (!turma || turma.classeId !== dados.classeId) {
            return problema(422, 'Dados inválidos', {
              errors: [{ campo: 'turmaId', mensagem: 'A turma não é desta classe.' }],
            })
          }
          if (contarInscritos(turma.id) >= turma.lotacaoMaxima) {
            return problema(409, 'Turma cheia', { code: 'LOTACAO_ESGOTADA' })
          }
        }

        let estudanteId = dados.estudanteId
        if (!estudanteId) {
          estudanteId = novoId('e')
          const numero = db.sequencia
          db.estudantes.push({
            id: estudanteId,
            numeroProcesso: `2026/${String(numero).padStart(5, '0')}`,
            nome: dados.estudante!.nome.trim(),
            dataNascimento: dados.estudante!.dataNascimento,
            fotografiaUrl: null,
            estado: 'ACTIVO',
            sexo: dados.estudante!.sexo,
            documentoIdentificacao: dados.estudante!.documentoIdentificacao || null,
            telefone: dados.estudante!.telefone || null,
            morada: dados.estudante!.morada || null,
            naturalidade: dados.estudante!.naturalidade || null,
            versao: 1,
            encarregadoIds: [],
          })
          for (const d of TIPOS_DOCUMENTO) {
            db.documentos.push({
              id: `${estudanteId}-${d.tipo}`,
              estudanteId,
              tipo: d.tipo,
              designacao: d.designacao,
              obrigatorio: d.obrigatorio,
              estado: dados.documentosEntregues.includes(d.tipo)
                ? 'ENTREGUE'
                : d.obrigatorio
                  ? 'EM_FALTA'
                  : 'DISPENSADO',
            })
          }
        }
        const estudante = db.estudantes.find((e) => e.id === estudanteId)!
        for (const enc of dados.encarregados) {
          const existente = db.encarregados.find((x) => x.telefone === enc.telefone)
          if (existente) {
            existente.educandos.push(estudanteId)
            estudante.encarregadoIds.push(existente.id)
          } else {
            const id = novoId('enc')
            db.encarregados.push({
              id,
              nome: enc.nome,
              parentesco: enc.parentesco,
              telefone: enc.telefone,
              email: enc.email || null,
              educandos: [estudanteId],
            })
            estudante.encarregadoIds[enc.principal ? 'unshift' : 'push'](id)
          }
        }
        const completos = TIPOS_DOCUMENTO_OBRIGATORIOS.every((t) =>
          db.documentos.some(
            (d) => d.estudanteId === estudanteId && d.tipo === t && d.estado === 'ENTREGUE',
          ),
        )
        const matricula = {
          id: novoId('m'),
          estudanteId,
          anoLectivoId: dados.anoLectivoId,
          classeId: dados.classeId,
          turmaId: dados.turmaId ?? null,
          estado: completos ? ('CONFIRMADA' as const) : ('PENDENTE' as const),
          criadaEm: new Date().toISOString(),
          resultado: null,
        }
        db.matriculas.push(matricula)
        // Transferência de entrada: a escola de origem e as classes lá concluídas entram no
        // percurso antes da matrícula, para a cronologia ficar completa (guia 2.3)
        const entrada = dados.transferenciaEntrada
        if (entrada?.escolaOrigem.trim()) {
          const anoLectivo = anosLectivos.find((a) => a.id === dados.anoLectivoId)!.designacao
          const escola = entrada.escolaOrigem.trim()
          for (const classeId of entrada.classesConcluidas) {
            db.percurso.push({
              id: novoId('p'),
              estudanteId,
              data: matricula.criadaEm,
              anoLectivo: 'Anterior',
              tipo: 'RESULTADO',
              descricao: `Concluiu a ${classePorId(classeId).designacao} em ${escola}`,
              autor: 'Maria Secretária',
              rectificaId: null,
              motivo: null,
            })
          }
          db.percurso.push({
            id: novoId('p'),
            estudanteId,
            data: matricula.criadaEm,
            anoLectivo,
            tipo: 'TRANSFERENCIA',
            descricao: `Transferido de ${escola}`,
            autor: 'Maria Secretária',
            rectificaId: null,
            motivo: null,
          })
        }
        db.percurso.push({
          id: novoId('p'),
          estudanteId,
          data: matricula.criadaEm,
          anoLectivo: anosLectivos.find((a) => a.id === dados.anoLectivoId)!.designacao,
          tipo: 'MATRICULA',
          descricao: `Matriculado na ${classePorId(dados.classeId).designacao}`,
          autor: 'Maria Secretária',
          rectificaId: null,
          motivo: null,
        })
        return HttpResponse.json(paraMatriculaDto(matricula), { status: 201 })
      })
    }),
  ),

  // ---------------------------------------------------------------- turmas e inscrições
  http.get(
    `${API}/turmas`,
    protegido('turmas:ler', ({ request }) => {
      const url = new URL(request.url)
      const anoLectivoId = url.searchParams.get('anoLectivoId')
      const estado = url.searchParams.get('estado')
      const turno = url.searchParams.get('turno')
      const classeId = url.searchParams.get('classeId')
      const filtradas = db.turmas.filter(
        (t) =>
          t.anoLectivoId === anoLectivoId &&
          (!estado || t.estado === estado) &&
          (!turno || t.turno === turno) &&
          (!classeId || t.classeId === classeId),
      )
      return HttpResponse.json(paginar(filtradas.map(paraTurmaDto), url))
    }),
  ),

  http.post(
    `${API}/turmas`,
    protegido('turmas:escrever', async ({ request }) => {
      const corpo = (await request.json()) as S['NovaTurmaDto']
      return idempotente(request, () => {
        if (anoEncerrado(corpo.anoLectivoId)) {
          return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
        }
        const classe = classes.find((c) => c.id === corpo.classeId)
        const lotacao = Number(corpo.lotacaoMaxima)
        const erros = [
          ...(!classe ? [{ campo: 'classeId', mensagem: 'Escolha a classe.' }] : []),
          ...(!['MANHA', 'TARDE', 'NOITE'].includes(corpo.turno)
            ? [{ campo: 'turno', mensagem: 'Escolha o turno.' }]
            : []),
          ...(!Number.isInteger(lotacao) || lotacao < 10 || lotacao > 60
            ? [{ campo: 'lotacaoMaxima', mensagem: 'A lotação vai de 10 a 60 estudantes.' }]
            : []),
        ]
        if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
        // Designação gerada: a letra seguinte livre na classe (7.ª A, B, C… D)
        const usadas = new Set(
          db.turmas
            .filter((t) => t.anoLectivoId === corpo.anoLectivoId && t.classeId === classe!.id)
            .map((t) => t.designacao.split(' ').at(-1)),
        )
        const letra = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !usadas.has(l))!
        const turma = {
          id: `${corpo.anoLectivoId}-${classe!.id}-${letra}`,
          anoLectivoId: corpo.anoLectivoId,
          designacao: `${classe!.designacao.replace(' classe', '')} ${letra}`,
          classeId: classe!.id,
          classeDesignacao: classe!.designacao,
          turno: corpo.turno,
          sala: corpo.sala?.trim() || null,
          lotacaoMaxima: lotacao,
          estado: 'ACTIVA' as const,
        }
        db.turmas.push(turma)
        auditar(
          utilizadorDo(request)!.nome,
          'CRIAR',
          'Turma',
          `${turma.designacao} (${lotacao} lugares)`,
        )
        return HttpResponse.json(paraTurmaDto(turma), { status: 201 })
      })
    }),
  ),

  http.post(
    `${API}/turmas/:id/encerrar`,
    protegido('turmas:escrever', async ({ request, params }) => {
      const turma = db.turmas.find((t) => t.id === params.id)
      if (!turma) return problema(404, 'Turma não encontrada')
      if (anoEncerrado(turma.anoLectivoId)) {
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      }
      if (turma.estado === 'ENCERRADA') {
        return problema(409, 'Já encerrada', { detail: 'Esta turma já está encerrada.' })
      }
      const inscritos = contarInscritos(turma.id)
      if (inscritos > 0) {
        return problema(409, 'Turma com inscritos', {
          code: 'TURMA_COM_INSCRITOS',
          detail: `Mova primeiro os ${inscritos} estudantes para outra turma.`,
        })
      }
      const { motivo } = (await request.json()) as S['MotivoDto']
      if ((motivo?.trim().length ?? 0) < 10) {
        return problema(422, 'Dados inválidos', {
          errors: [
            { campo: 'motivo', mensagem: 'Explique porque encerra (pelo menos 10 caracteres).' },
          ],
        })
      }
      const hoje = hojeEmAngola()
      for (const a of db.atribuicoes) {
        if (a.turmaId === turma.id && a.ate === null) {
          a.ate = hoje
          a.motivo = 'Turma encerrada'
        }
      }
      turma.estado = 'ENCERRADA'
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Turma',
        `${turma.designacao}: encerrada (${motivo.trim()})`,
      )
      return HttpResponse.json(paraTurmaDto(turma))
    }),
  ),

  http.get(
    `${API}/turmas/:id`,
    protegido('turmas:ler', ({ params }) => {
      const turma = turmaPorId(String(params.id))
      if (!turma) return problema(404, 'Turma não encontrada')
      return HttpResponse.json(paraTurmaDto(turma), {
        headers: { ETag: etag(turma.versao ?? 1) },
      })
    }),
  ),

  http.patch(
    `${API}/turmas/:id`,
    protegido('turmas:escrever', async ({ request, params }) => {
      const turma = turmaPorId(String(params.id))
      if (!turma) return problema(404, 'Turma não encontrada')
      const versaoPedida = request.headers.get('If-Match')
      if (versaoPedida && versaoPedida !== etag(turma.versao ?? 1)) {
        return problema(412, 'Versão desactualizada', { code: 'VERSAO_DESACTUALIZADA' })
      }
      if (turma.estado !== 'ACTIVA' || anoEncerrado(turma.anoLectivoId)) {
        return problema(409, 'Turma encerrada', { detail: 'Uma turma encerrada já não muda.' })
      }
      const alteracao = (await request.json()) as S['TurmaAlteracaoDto']
      const detalhes: string[] = []
      if (alteracao.sala !== undefined) {
        const sala = alteracao.sala?.trim() || null
        if (sala && sala.length > 20) {
          return problema(422, 'Dados inválidos', {
            errors: [{ campo: 'sala', mensagem: 'Até 20 caracteres.' }],
          })
        }
        const ocupada =
          sala &&
          db.turmas.find(
            (t) =>
              t.id !== turma.id &&
              t.anoLectivoId === turma.anoLectivoId &&
              t.estado === 'ACTIVA' &&
              t.turno === turma.turno &&
              normalizar(t.sala ?? '') === normalizar(sala),
          )
        if (ocupada) {
          return problema(422, 'Dados inválidos', {
            errors: [
              {
                campo: 'sala',
                mensagem: `A ${sala} já é da ${ocupada.designacao} no mesmo turno.`,
              },
            ],
          })
        }
        turma.sala = sala
        detalhes.push(`sala ${sala ?? '(sem sala)'}`)
      }
      if (alteracao.directorTurmaId !== undefined) {
        const id = alteracao.directorTurmaId
        const professor = id ? db.professores.find((p) => p.id === id) : null
        if (id && !professor) return problema(404, 'Professor não encontrado')
        if (professor && professor.estado !== 'ACTIVO') {
          return problema(422, 'Dados inválidos', {
            errors: [
              { campo: 'directorTurmaId', mensagem: 'Só um professor activo dirige turma.' },
            ],
          })
        }
        const outra =
          professor &&
          db.turmas.find(
            (t) =>
              t.id !== turma.id &&
              t.anoLectivoId === turma.anoLectivoId &&
              t.estado === 'ACTIVA' &&
              t.directorTurmaId === professor.id,
          )
        if (outra) {
          return problema(422, 'Dados inválidos', {
            errors: [
              {
                campo: 'directorTurmaId',
                mensagem: `${professor.nome} já é director de turma da ${outra.designacao}.`,
              },
            ],
          })
        }
        turma.directorTurmaId = professor?.id ?? null
        detalhes.push(`director de turma ${professor?.nome ?? '(nenhum)'}`)
      }
      turma.versao = (turma.versao ?? 1) + 1
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Turma',
        `${turma.designacao}: ${detalhes.join(', ')}`,
      )
      return HttpResponse.json(paraTurmaDto(turma), { headers: { ETag: etag(turma.versao) } })
    }),
  ),

  http.get(
    `${API}/turmas/:id/inscritos`,
    protegido('turmas:ler', ({ params }) =>
      HttpResponse.json(
        db.matriculas
          .filter((m) => m.turmaId === params.id && m.estado !== 'ANULADA')
          .map(paraInscritoDto)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
      ),
    ),
  ),

  http.post(
    `${API}/turmas/:id/inscricoes`,
    protegido('turmas:escrever', async ({ request, params }) => {
      const turma = turmaPorId(String(params.id))
      if (!turma) return problema(404, 'Turma não encontrada')
      const { matriculaId, excepcaoJustificacao } = (await request.json()) as S['InscreverDto']
      const matricula = db.matriculas.find((m) => m.id === matriculaId)
      if (!matricula) return problema(404, 'Matrícula não encontrada')
      // Só se inscreve numa turma uma matrícula confirmada (guia 2.1)
      if (matricula.estado !== 'CONFIRMADA') {
        return problema(409, 'Matrícula por confirmar', { code: 'MATRICULA_POR_CONFIRMAR' })
      }
      const recusa = validarDestino(request, turma.id, matricula.classeId, excepcaoJustificacao)
      if (recusa) return recusa
      if (matricula.turmaId) {
        return problema(409, 'Já inscrito', {
          code: 'INSCRICAO_EXISTENTE',
          detail: 'Use Mover para mudar de turma.',
        })
      }
      matricula.turmaId = turma.id
      registarPercurso(matricula.estudanteId, 'INSCRICAO', `Inscrito na turma ${turma.designacao}`)
      return HttpResponse.json(paraInscritoDto(matricula))
    }),
  ),

  http.delete(
    `${API}/inscricoes/:matriculaId`,
    protegido('turmas:escrever', ({ params }) => {
      const matricula = db.matriculas.find((m) => m.id === params.matriculaId)
      if (!matricula?.turmaId) return problema(404, 'Inscrição não encontrada')
      const turma = turmaPorId(matricula.turmaId)!
      if (anoEncerrado(turma.anoLectivoId))
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      matricula.turmaId = null
      registarPercurso(
        matricula.estudanteId,
        'RECTIFICACAO',
        `Inscrição na turma ${turma.designacao} desfeita`,
      )
      return HttpResponse.json({})
    }),
  ),

  http.post(
    `${API}/inscricoes/:matriculaId/mover`,
    protegido('turmas:escrever', async ({ request, params }) => {
      const matricula = db.matriculas.find((m) => m.id === params.matriculaId)
      if (!matricula?.turmaId) return problema(404, 'Inscrição não encontrada')
      const { turmaDestinoId, motivo, excepcaoJustificacao } =
        (await request.json()) as S['MoverInscricaoDto']
      const destino = turmaPorId(turmaDestinoId)
      if (!destino) return problema(404, 'Turma não encontrada')
      const recusa = validarDestino(request, destino.id, matricula.classeId, excepcaoJustificacao)
      if (recusa) return recusa
      if (!motivo?.trim()) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'motivo', mensagem: 'Indique o motivo da mudança.' }],
        })
      }
      const origem = turmaPorId(matricula.turmaId)!
      matricula.turmaId = destino.id
      registarPercurso(
        matricula.estudanteId,
        'MUDANCA_TURMA',
        `Mudou de ${origem.designacao} para ${destino.designacao}: ${motivo}`,
      )
      return HttpResponse.json(paraInscritoDto(matricula))
    }),
  ),

  http.post(
    `${API}/turmas/:id/lista-nominal`,
    protegido('turmas:ler', ({ request, params }) =>
      idempotente(request, () => {
        const turma = turmaPorId(String(params.id))
        if (!turma) return problema(404, 'Turma não encontrada')
        const tarefa: Tarefa = {
          id: novoId('t'),
          tipo: 'LISTA_NOMINAL',
          parametros: { anoLectivoId: turma.anoLectivoId, turmaId: turma.id },
          titulo: `Lista nominal da ${turma.designacao}`,
          utilizadorId: utilizadorDo(request)?.id ?? null,
          inicio: Date.now(),
          duracao: import.meta.env.MODE === 'test' ? 0 : 6000,
          // A turma C simula uma falha, para mostrar o relatório de erros por linha
          falha: turma.designacao.endsWith('C'),
        }
        db.tarefas.push(tarefa)
        return HttpResponse.json(paraTarefaDto(tarefa), { status: 202 })
      }),
    ),
  ),

  http.get(
    `${API}/tarefas/:id`,
    protegido(null, ({ params }) => {
      const tarefa = db.tarefas.find((t) => t.id === params.id)
      if (!tarefa) return problema(404, 'Tarefa não encontrada')
      return HttpResponse.json(paraTarefaDto(tarefa))
    }),
  ),

  http.post(
    `${API}/matriculas/confirmar`,
    protegido('matriculas:escrever', async ({ request }) => {
      const { ids } = (await request.json()) as { ids: string[] }
      if (!Array.isArray(ids) || !ids.length) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'ids', mensagem: 'Escolha pelo menos uma matrícula.' }],
        })
      }
      const quem = utilizadorDo(request)!.nome
      return idempotente(request, () => {
        const confirmadas: S['MatriculaDto'][] = []
        const recusadas: S['ResultadoLoteDto']['recusadas'] = []
        for (const id of ids) {
          const { erro, matricula } = confirmarMatricula(id, quem)
          if (matricula) confirmadas.push(paraMatriculaDto(matricula))
          else {
            const m = db.matriculas.find((x) => x.id === id)
            const nome = m ? db.estudantes.find((e) => e.id === m.estudanteId)!.nome : id
            recusadas.push({
              id,
              estudanteNome: nome,
              motivo:
                erro?.status === 409
                  ? 'Faltam documentos obrigatórios.'
                  : 'Matrícula não encontrada.',
            })
          }
        }
        return HttpResponse.json({ confirmadas, recusadas } satisfies S['ResultadoLoteDto'])
      })
    }),
  ),

  http.post(
    `${API}/matriculas/:id/confirmar`,
    protegido('matriculas:escrever', ({ request, params }) => {
      const { erro, matricula } = confirmarMatricula(String(params.id), utilizadorDo(request)!.nome)
      return erro ?? HttpResponse.json(paraMatriculaDto(matricula!))
    }),
  ),

  // ---------------------------------------------------------------- anular matrícula e situação
  http.post(
    `${API}/matriculas/:id/anular`,
    protegido('matriculas:escrever', async ({ request, params }) => {
      const m = db.matriculas.find((x) => x.id === params.id)
      if (!m) return problema(404, 'Matrícula não encontrada')
      if (anoEncerrado(m.anoLectivoId))
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      if (m.estado !== 'PENDENTE' && m.estado !== 'CONFIRMADA') {
        return problema(409, 'Estado inválido', { detail: 'Esta matrícula já não está activa.' })
      }
      const { motivo } = (await request.json()) as S['MotivoDto']
      if ((motivo?.trim().length ?? 0) < 10) {
        return problema(422, 'Dados inválidos', {
          errors: [
            { campo: 'motivo', mensagem: 'Explique porque anula (pelo menos 10 caracteres).' },
          ],
        })
      }
      const e = db.estudantes.find((x) => x.id === m.estudanteId)!
      const quem = utilizadorDo(request)!.nome
      const classe = classePorId(m.classeId).designacao
      m.estado = 'ANULADA'
      m.turmaId = null
      db.percurso.push({
        id: novoId('p'),
        estudanteId: e.id,
        data: new Date().toISOString(),
        anoLectivo: anosLectivos.find((a) => a.id === m.anoLectivoId)!.designacao,
        tipo: 'MATRICULA',
        descricao: `Matrícula anulada na ${classe}`,
        autor: quem,
        rectificaId: null,
        motivo: motivo.trim(),
      })
      auditar(quem, 'ALTERAR', 'Matrícula', `${e.nome}: matrícula na ${classe} anulada`)
      return HttpResponse.json(paraMatriculaDto(m))
    }),
  ),

  http.post(
    `${API}/estudantes/:id/situacao`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      const { accao, data, motivo } = (await request.json()) as S['MudarSituacaoDto']
      const origem: Record<S['AccaoSituacao'], S['EstadoEstudante']> = {
        DESISTENCIA: 'ACTIVO',
        REINGRESSO: 'DESISTENTE',
        ANULACAO: 'ACTIVO',
      }
      if (e.estado !== origem[accao]) {
        return problema(409, 'Estado inválido', {
          detail: 'Esta mudança não se aplica à situação actual do estudante.',
        })
      }
      const hoje = hojeEmAngola()
      const erros = [
        ...(!data || data > hoje
          ? [{ campo: 'data', mensagem: 'A data não pode ser no futuro.' }]
          : []),
        ...((motivo?.trim().length ?? 0) < 10
          ? [{ campo: 'motivo', mensagem: 'Explique o motivo (pelo menos 10 caracteres).' }]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const activas = db.matriculas.filter(
        (m) => m.estudanteId === e.id && (m.estado === 'PENDENTE' || m.estado === 'CONFIRMADA'),
      )
      if (accao !== 'REINGRESSO' && activas.some((m) => anoEncerrado(m.anoLectivoId))) {
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      }
      const quem = utilizadorDo(request)!.nome
      if (accao !== 'REINGRESSO') {
        for (const m of activas) {
          m.estado = 'ANULADA'
          m.turmaId = null
        }
      }
      e.estado =
        accao === 'DESISTENCIA' ? 'DESISTENTE' : accao === 'ANULACAO' ? 'ANULADO' : 'ACTIVO'
      e.versao++
      const texto = {
        DESISTENCIA: 'Desistência',
        REINGRESSO: 'Reingresso',
        ANULACAO: 'Processo anulado',
      }[accao]
      db.percurso.push({
        id: novoId('p'),
        estudanteId: e.id,
        data: `${data}T12:00:00Z`,
        anoLectivo: anosLectivos.find((a) => a.estado === 'EM_CURSO')?.designacao ?? '2026/2027',
        tipo: 'SITUACAO',
        descricao: texto,
        autor: quem,
        rectificaId: null,
        motivo: motivo.trim(),
      })
      auditar(quem, 'ALTERAR', 'Estudante', `${e.nome}: ${texto.toLowerCase()}`)
      return HttpResponse.json(paraEstudanteDto(e))
    }),
  ),

  // ---------------------------------------------------------------- transferência de saída
  http.post(
    `${API}/estudantes/:id/transferir`,
    protegido('estudantes:escrever', async ({ request, params }) => {
      const e = db.estudantes.find((x) => x.id === params.id)
      if (!e) return problema(404, 'Estudante não encontrado')
      if (e.estado !== 'ACTIVO') {
        return problema(409, 'Estado inválido', {
          detail: 'Só um estudante activo pode ser transferido.',
        })
      }
      const corpo = (await request.json()) as S['TransferirEstudanteDto']
      const escola = corpo.escolaDestino?.trim() ?? ''
      const hoje = hojeEmAngola()
      const erros = [
        ...(escola.length < 3
          ? [{ campo: 'escolaDestino', mensagem: 'Indique a escola de destino.' }]
          : []),
        ...(!corpo.data || corpo.data > hoje
          ? [{ campo: 'data', mensagem: 'A data não pode ser no futuro.' }]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const activas = db.matriculas.filter(
        (m) => m.estudanteId === e.id && (m.estado === 'PENDENTE' || m.estado === 'CONFIRMADA'),
      )
      if (activas.some((m) => anoEncerrado(m.anoLectivoId))) {
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      }
      const quem = utilizadorDo(request)!.nome
      for (const m of activas) {
        m.estado = 'ANULADA'
        m.turmaId = null
      }
      e.estado = 'TRANSFERIDO'
      e.versao++
      const ano = anosLectivos.find((a) => a.estado === 'EM_CURSO')?.designacao ?? '2026/2027'
      db.percurso.push({
        id: novoId('p'),
        estudanteId: e.id,
        data: `${corpo.data}T12:00:00Z`,
        anoLectivo: ano,
        tipo: 'TRANSFERENCIA',
        descricao: `Transferido para ${escola}`,
        autor: quem,
        rectificaId: null,
        motivo: corpo.motivo?.trim() || null,
      })
      auditar(quem, 'ALTERAR', 'Estudante', `${e.nome}: transferido para ${escola}`)
      return HttpResponse.json(paraEstudanteDto(e))
    }),
  ),

  // ---------------------------------------------------------------- resultados finais
  http.get(
    `${API}/turmas/:id/resultados`,
    protegido('matriculas:ler', ({ params }) => {
      const turma = db.turmas.find((t) => t.id === params.id)
      if (!turma) return problema(404, 'Turma não encontrada')
      return HttpResponse.json(resultadosDa(turma.id))
    }),
  ),

  http.put(
    `${API}/turmas/:id/resultados`,
    protegido('matriculas:escrever', async ({ request, params }) => {
      const turma = db.turmas.find((t) => t.id === params.id)
      if (!turma) return problema(404, 'Turma não encontrada')
      if (anoEncerrado(turma.anoLectivoId)) {
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      }
      const { resultados } = (await request.json()) as S['RegistarResultadosDto']
      const daTurma = new Map(
        db.matriculas
          .filter((m) => m.turmaId === turma.id && m.estado === 'CONFIRMADA')
          .map((m) => [m.id, m]),
      )
      const invalidos = resultados.filter(
        (r) =>
          !daTurma.has(r.matriculaId) ||
          (r.resultado !== null && r.resultado !== 'APROVADO' && r.resultado !== 'REPROVADO'),
      )
      if (invalidos.length) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'resultados', mensagem: 'Há matrículas que não são desta turma.' }],
        })
      }
      for (const r of resultados) daTurma.get(r.matriculaId)!.resultado = r.resultado
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Resultados finais',
        `${turma.designacao}: ${resultados.length} resultados registados`,
      )
      return HttpResponse.json(resultadosDa(turma.id))
    }),
  ),

  // ---------------------------------------------------------------- vistas guardadas
  http.get(
    `${API}/vistas`,
    protegido(null, ({ request }) => {
      const utilizador = utilizadorDo(request)!
      const ecra = new URL(request.url).searchParams.get('ecra')
      return HttpResponse.json(
        db.vistas
          .filter((v) => v.utilizadorId === utilizador.id && v.ecra === ecra)
          .map(({ utilizadorId: _, ...v }) => v) satisfies S['VistaDto'][],
      )
    }),
  ),

  http.post(
    `${API}/vistas`,
    protegido(null, async ({ request }) => {
      const utilizador = utilizadorDo(request)!
      const corpo = (await request.json()) as S['NovaVistaDto']
      const nome = corpo.nome?.trim() ?? ''
      if (nome.length < 2) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'nome', mensagem: 'Dê um nome à vista.' }],
        })
      }
      const repetida = db.vistas.some(
        (v) =>
          v.utilizadorId === utilizador.id &&
          v.ecra === corpo.ecra &&
          normalizar(v.nome) === normalizar(nome),
      )
      if (repetida) {
        return problema(409, 'Vista repetida', {
          code: 'VISTA_REPETIDA',
          errors: [{ campo: 'nome', mensagem: 'Já tem uma vista com este nome.' }],
        })
      }
      const vista = { id: novoId('v'), ecra: corpo.ecra, nome, filtros: corpo.filtros }
      db.vistas.push({ ...vista, utilizadorId: utilizador.id })
      return HttpResponse.json(vista satisfies S['VistaDto'], { status: 201 })
    }),
  ),

  http.delete(
    `${API}/vistas/:id`,
    protegido(null, ({ request, params }) => {
      const utilizador = utilizadorDo(request)!
      const indice = db.vistas.findIndex(
        (v) => v.id === params.id && v.utilizadorId === utilizador.id,
      )
      if (indice < 0) return problema(404, 'Vista não encontrada')
      db.vistas.splice(indice, 1)
      return HttpResponse.json({})
    }),
  ),

  // O resultado chega por um URL de curta duração, como uma ligação assinada: não leva o token
  http.get(`${API}/tarefas/:id/resultado`, ({ params }) => {
    const tarefa = db.tarefas.find((t) => t.id === params.id)
    if (!tarefa) return problema(404, 'Resultado não encontrado')
    if (tarefa.tipo === 'DOCUMENTOS_LOTE') return pdfDoLote(tarefa)
    const { nome, linhas } = gerarCsv(tarefa)
    return new HttpResponse(linhas.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nome}"`,
      },
    })
  }),

  ...handlersRelatorios,
  ...handlersAdministracao,
  ...handlersAnos,
  ...handlersRenovacoes,
  ...handlersDistribuicao,
  ...handlersImportacoes,
  ...handlersClasses,
  ...handlersDocumentosOficiais,
  ...handlersAcademicos,
]

/** Confirmar: ano aberto, matrícula pendente e documentos obrigatórios entregues (guia 2.4). */
function confirmarMatricula(id: string, quem: string) {
  const matricula = db.matriculas.find((m) => m.id === id)
  if (!matricula) return { erro: problema(404, 'Matrícula não encontrada') }
  if (anoEncerrado(matricula.anoLectivoId)) {
    return { erro: problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' }) }
  }
  if (matricula.estado === 'CONFIRMADA') return { matricula }
  const emFalta = db.documentos.filter(
    (d) => d.estudanteId === matricula.estudanteId && d.obrigatorio && d.estado === 'EM_FALTA',
  )
  if (emFalta.length) {
    return {
      erro: problema(409, 'Documentos em falta', {
        code: 'DOCUMENTOS_EM_FALTA',
        detail: `Faltam ${emFalta.length} documentos obrigatórios.`,
        emFalta: emFalta.map((d) => d.designacao),
      }),
    }
  }
  matricula.estado = 'CONFIRMADA'
  registarPercurso(matricula.estudanteId, 'MATRICULA', 'Matrícula confirmada')
  const nome = db.estudantes.find((e) => e.id === matricula.estudanteId)?.nome ?? ''
  auditar(quem, 'CONFIRMAR', 'Matrícula', `${nome}: documentos completos; matrícula confirmada`)
  return { matricula }
}

/** Regras ao colocar uma matrícula numa turma: ano aberto, mesma classe, lotação (guia 2.4). */
function validarDestino(request: Request, turmaId: string, classeId: string, excepcao?: string) {
  const turma = turmaPorId(turmaId)!
  if (anoEncerrado(turma.anoLectivoId) || turma.estado === 'ENCERRADA') {
    return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
  }
  if (turma.classeId !== classeId) {
    return problema(422, 'Dados inválidos', {
      errors: [{ campo: 'turmaId', mensagem: 'A turma não é desta classe.' }],
    })
  }
  const podeExcepcao = utilizadorDo(request)?.permissoes.includes('inscricoes:excepcao')
  if (contarInscritos(turma.id) >= turma.lotacaoMaxima && !(excepcao?.trim() && podeExcepcao)) {
    return problema(409, 'Turma cheia', {
      code: 'LOTACAO_ESGOTADA',
      detail: `${turma.designacao} já tem ${contarInscritos(turma.id)} de ${turma.lotacaoMaxima}.`,
    })
  }
  return null
}

export function registarPercurso(
  estudanteId: string,
  tipo: S['TipoEventoPercurso'],
  descricao: string,
  anoLectivo = '2026/2027',
  autor = 'Maria Secretária',
) {
  db.percurso.push({
    id: novoId('p'),
    estudanteId,
    data: new Date().toISOString(),
    anoLectivo,
    tipo,
    descricao,
    autor,
    rectificaId: null,
    motivo: null,
  })
}

/** Matrículas confirmadas da turma com o resultado final, por ordem alfabética. */
function resultadosDa(turmaId: string): S['ResultadoFinalDto'][] {
  return db.matriculas
    .filter((m) => m.turmaId === turmaId && (m.estado === 'CONFIRMADA' || m.estado === 'CONCLUIDA'))
    .map((m) => {
      const e = db.estudantes.find((x) => x.id === m.estudanteId)!
      return {
        matriculaId: m.id,
        estudanteId: e.id,
        nome: e.nome,
        numeroProcesso: e.numeroProcesso,
        resultado: m.resultado,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}

function validarEncarregado(corpo: S['AcrescentarEncarregadoDto']) {
  const telefone = corpo.telefone?.replace(/\D/g, '') ?? ''
  return [
    ...((corpo.nome?.trim().split(/\s+/).length ?? 0) < 2
      ? [{ campo: 'nome', mensagem: 'Escreva o nome completo.' }]
      : []),
    ...(!corpo.parentesco?.trim()
      ? [{ campo: 'parentesco', mensagem: 'Indique o parentesco.' }]
      : []),
    ...(!/^9\d{8}$/.test(telefone)
      ? [{ campo: 'telefone', mensagem: 'O telefone tem 9 dígitos e começa por 9.' }]
      : []),
  ]
}
