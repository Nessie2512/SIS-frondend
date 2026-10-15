import { delay, http, HttpResponse, type DefaultBodyType, type StrictRequest } from 'msw'
import type { components } from '@/shared/api'
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
} from './db'

type S = components['schemas']
const API = '/api/v1'

/** Latência simulada só no navegador; nos testes responde de imediato. */
const latencia = (ms: number) => delay(import.meta.env.MODE === 'test' ? 0 : ms)

// ---------------------------------------------------------------------------
// Respostas de erro no formato application/problem+json (guia 2.6)
// ---------------------------------------------------------------------------
function problema(
  status: number,
  title: string,
  extra: Partial<S['ProblemaDto']> & Record<string, unknown> = {},
) {
  return HttpResponse.json(
    { title, status, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

// ---------------------------------------------------------------------------
// Sessão simulada: token "tk-<utilizador>"; o cookie "sessao" faz de token de renovação
// ---------------------------------------------------------------------------
function utilizadorDo(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const id = token?.startsWith('tk-') ? token.slice(3) : undefined
  return UTILIZADORES.find((u) => u.id === id)
}

type Contexto = {
  request: StrictRequest<DefaultBodyType>
  params: Record<string, string | readonly string[] | undefined>
}

/** Exige sessão (401) e, opcionalmente, uma permissão (403). */
function protegido<C extends Contexto>(
  permissao: string | null,
  resolver: (c: C) => Response | Promise<Response>,
) {
  return async (contexto: C) => {
    await latencia(120)
    const utilizador = utilizadorDo(contexto.request)
    if (!utilizador) return problema(401, 'Sessão expirada')
    if (permissao && !utilizador.permissoes.includes(permissao)) {
      return problema(403, 'Permissão negada', { code: 'PERMISSAO_NEGADA' })
    }
    return resolver(contexto)
  }
}

const anoEncerrado = (anoLectivoId: string) =>
  anosLectivos.find((a) => a.id === anoLectivoId)?.estado === 'ENCERRADO'
const etag = (versao: number) => `"v${versao}"`

function paginar<T>(lista: T[], url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') ?? 50))
  return {
    items: lista.slice((page - 1) * pageSize, page * pageSize),
    total: lista.length,
    page,
    pageSize,
  }
}

/** Repete a resposta original quando a mesma Idempotency-Key volta a chegar (guia 4.5). */
function idempotente(request: Request, criar: () => Response): Response {
  const chave = request.headers.get('Idempotency-Key')
  if (!chave) return problema(400, 'Falta a Idempotency-Key')
  const anterior = db.idempotencia.get(chave) as { status: number; corpo: unknown } | undefined
  if (anterior)
    return HttpResponse.json(anterior.corpo as DefaultBodyType, { status: anterior.status })
  const resposta = criar()
  void resposta
    .clone()
    .json()
    .then((corpo) => db.idempotencia.set(chave, { status: resposta.status, corpo }))
  return resposta
}

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
    const { palavraPasse: _, ...me } = utilizador
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
      const lista = db.estudantes
        .filter((e) => {
          const m = matriculaDe(e.id, anoLectivoId)
          return (
            (!pesquisa ||
              normalizar(e.nome).includes(pesquisa) ||
              e.numeroProcesso.includes(pesquisa)) &&
            (!classeId || m?.classeId === classeId) &&
            (!estado || e.estado === estado)
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
        if (!dados.encarregados.length)
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
        }
        db.matriculas.push(matricula)
        db.percurso.push({
          id: novoId('p'),
          estudanteId,
          data: matricula.criadaEm,
          anoLectivo: anosLectivos.find((a) => a.id === dados.anoLectivoId)!.designacao,
          tipo: 'MATRICULA',
          descricao: `Matriculado na ${classePorId(dados.classeId).designacao}`,
          autor: 'Maria Secretária',
          rectificaId: null,
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

  http.get(
    `${API}/turmas/:id`,
    protegido('turmas:ler', ({ params }) => {
      const turma = turmaPorId(String(params.id))
      if (!turma) return problema(404, 'Turma não encontrada')
      return HttpResponse.json(paraTurmaDto(turma))
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
        const tarefa = {
          id: novoId('t'),
          titulo: `Lista nominal da ${turma.designacao}`,
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
]

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

function registarPercurso(estudanteId: string, tipo: S['TipoEventoPercurso'], descricao: string) {
  db.percurso.push({
    id: novoId('p'),
    estudanteId,
    data: new Date().toISOString(),
    anoLectivo: '2026/2027',
    tipo,
    descricao,
    autor: 'Maria Secretária',
    rectificaId: null,
  })
}
