import { http, HttpResponse } from 'msw'
import { TIPOS_DOCUMENTO_PROFESSOR, type Plano, type Professor } from './academico'
import { anoEncerrado, API, etag, paginar, problema, protegido, type S } from './apoio'
import { anosLectivos, db, normalizar, novoId } from './db'

// ---------------------------------------------------------------------------
// Projecções para DTO
// ---------------------------------------------------------------------------
const disciplinaPorId = (id: string) => db.disciplinas.find((d) => d.id === id)!

const cargaDe = (professorId: string, anoLectivoId: string) =>
  db.atribuicoes
    .filter((a) => a.professorId === professorId && a.anoLectivoId === anoLectivoId)
    .reduce((soma, a) => soma + a.horasSemanais, 0)

function paraProfessorResumo(p: Professor, anoLectivoId: string): S['ProfessorResumoDto'] {
  return {
    id: p.id,
    numeroAgente: p.numeroAgente,
    nome: p.nome,
    estado: p.estado,
    disciplinas: p.habilitadas.map((id) => {
      const d = disciplinaPorId(id)
      return { id: d.id, nome: d.nome, sigla: d.sigla }
    }),
    cargaLectiva: cargaDe(p.id, anoLectivoId),
    cargaMaxima: p.cargaMaxima,
    telefone: p.telefone,
    email: p.email,
    fotografiaUrl: null,
  }
}

function paraProfessorDto(p: Professor, anoLectivoId: string): S['ProfessorDto'] {
  return {
    ...paraProfessorResumo(p, anoLectivoId),
    habilitacao: p.habilitacao,
    dataAdmissao: p.dataAdmissao,
    atribuicoes: db.atribuicoes
      .filter((a) => a.professorId === p.id && a.anoLectivoId === anoLectivoId)
      .map((a) => {
        const turma = db.turmas.find((t) => t.id === a.turmaId)!
        return {
          id: a.id,
          turmaId: a.turmaId,
          turma: turma.designacao,
          classe: turma.classeDesignacao,
          disciplinaId: a.disciplinaId,
          disciplina: disciplinaPorId(a.disciplinaId).nome,
          horasSemanais: a.horasSemanais,
          desde: a.desde,
        }
      })
      .sort(
        (a, b) =>
          a.turma.localeCompare(b.turma, 'pt', { numeric: true }) ||
          a.disciplina.localeCompare(b.disciplina, 'pt'),
      ),
    documentos: p.documentos.map((d) => ({
      tipo: d.tipo,
      rotulo: TIPOS_DOCUMENTO_PROFESSOR[d.tipo] ?? d.tipo,
      estado: d.estado,
    })),
  }
}

/** Usada num plano (de qualquer versão) ou numa habilitação: não se elimina (guia 2.4). */
export const disciplinaEmUso = (disciplinaId: string) =>
  db.planos.some((p) => p.linhas.some((l) => l.disciplinaId === disciplinaId)) ||
  db.professores.some((p) => p.habilitadas.includes(disciplinaId))

function paraDisciplinaDto(d: (typeof db.disciplinas)[number]): S['DisciplinaDto'] {
  return { ...d, emUso: disciplinaEmUso(d.id) }
}

function paraPlanoResumo(p: Plano): S['PlanoResumoDto'] {
  return {
    id: p.id,
    classeId: p.classeId,
    versao: p.versao,
    estado: p.estado,
    publicadoEm: p.publicadoEm,
    totalHoras: p.linhas.reduce((soma, l) => soma + l.horasSemanais, 0),
  }
}

function paraPlanoDto(p: Plano): S['PlanoDto'] {
  return {
    ...paraPlanoResumo(p),
    revisao: etag(p.revisao),
    linhas: p.linhas
      .map((l) => {
        const d = disciplinaPorId(l.disciplinaId)
        return {
          disciplinaId: d.id,
          disciplina: d.nome,
          sigla: d.sigla,
          horasSemanais: l.horasSemanais,
        }
      })
      .sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt')),
  }
}

const respostaPlano = (p: Plano) =>
  HttpResponse.json(paraPlanoDto(p), { headers: { ETag: etag(p.revisao) } })

/** Regras comuns às alterações do plano: existe, é rascunho e a versão confere (412). */
function planoEditavel(request: Request, id: string) {
  const plano = db.planos.find((p) => p.id === id)
  if (!plano) return { erro: problema(404, 'Plano não encontrado') }
  if (plano.estado !== 'RASCUNHO') {
    return { erro: problema(409, 'Plano não editável', { code: 'PLANO_NAO_EDITAVEL' }) }
  }
  const pedida = request.headers.get('If-Match')
  if (pedida && pedida !== etag(plano.revisao)) {
    return { erro: problema(412, 'Versão desactualizada', { code: 'VERSAO_DESACTUALIZADA' }) }
  }
  return { plano }
}

function horasValidas(horas: unknown) {
  return Number.isInteger(horas) && (horas as number) >= 1 && (horas as number) <= 10
}
const erroHoras = () =>
  problema(422, 'Dados inválidos', {
    errors: [{ campo: 'horasSemanais', mensagem: 'Indique entre 1 e 10 horas por semana.' }],
  })

const ESTADOS_PROFESSOR: S['EstadoProfessor'][] = ['ACTIVO', 'LICENCA', 'SUSPENSO', 'DESLIGADO']

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
export const handlersAcademicos = [
  http.get(
    `${API}/professores`,
    protegido('professores:ler', ({ request }) => {
      const url = new URL(request.url)
      const anoLectivoId = url.searchParams.get('anoLectivoId') ?? 'ano-2026'
      const pesquisa = normalizar(url.searchParams.get('pesquisa') ?? '')
      const estado = url.searchParams.get('estado')
      const disciplinaId = url.searchParams.get('disciplinaId')
      const lista = db.professores
        .filter(
          (p) =>
            (!pesquisa ||
              normalizar(p.nome).includes(pesquisa) ||
              p.numeroAgente.includes(pesquisa)) &&
            (!estado || p.estado === estado) &&
            (!disciplinaId || p.habilitadas.includes(disciplinaId)),
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
        .map((p) => paraProfessorResumo(p, anoLectivoId))
      return HttpResponse.json(paginar(lista, url) satisfies S['PaginaProfessorDto'])
    }),
  ),

  http.get(
    `${API}/professores/:id`,
    protegido('professores:ler', ({ request, params }) => {
      const professor = db.professores.find((p) => p.id === params.id)
      if (!professor) return problema(404, 'Professor não encontrado')
      const anoLectivoId = new URL(request.url).searchParams.get('anoLectivoId') ?? 'ano-2026'
      return HttpResponse.json(paraProfessorDto(professor, anoLectivoId))
    }),
  ),

  http.post(
    `${API}/professores/:id/estado`,
    protegido('professores:escrever', async ({ request, params }) => {
      const professor = db.professores.find((p) => p.id === params.id)
      if (!professor) return problema(404, 'Professor não encontrado')
      const corpo = (await request.json()) as S['AlterarEstadoProfessorDto']
      if (!ESTADOS_PROFESSOR.includes(corpo.estado)) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'estado', mensagem: 'Estado desconhecido.' }],
        })
      }
      professor.estado = corpo.estado
      return HttpResponse.json({ id: professor.id, estado: professor.estado })
    }),
  ),

  http.get(
    `${API}/disciplinas`,
    protegido(null, () =>
      HttpResponse.json(
        [...db.disciplinas]
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
          .map(paraDisciplinaDto) satisfies S['DisciplinaDto'][],
      ),
    ),
  ),
  http.post(
    `${API}/disciplinas`,
    protegido('curriculo:escrever', async ({ request }) => {
      const corpo = (await request.json()) as S['NovaDisciplinaDto']
      const nome = corpo.nome?.trim() ?? ''
      const sigla = corpo.sigla?.trim().toUpperCase() ?? ''
      const erros = [
        ...(nome.length < 3 ? [{ campo: 'nome', mensagem: 'Escreva o nome da disciplina.' }] : []),
        ...(!/^[A-Z]{2,5}$/.test(sigla)
          ? [{ campo: 'sigla', mensagem: 'A sigla tem 2 a 5 letras.' }]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const repetida = db.disciplinas.find(
        (d) => normalizar(d.nome) === normalizar(nome) || d.sigla === sigla,
      )
      if (repetida) {
        return problema(409, 'Disciplina repetida', {
          code: 'DISCIPLINA_REPETIDA',
          errors: [
            normalizar(repetida.nome) === normalizar(nome)
              ? { campo: 'nome', mensagem: 'Já existe uma disciplina com este nome.' }
              : { campo: 'sigla', mensagem: 'Esta sigla já está em uso.' },
          ],
        })
      }
      const disciplina = { id: novoId('d-'), nome, sigla, estado: 'ACTIVA' as const }
      db.disciplinas.push(disciplina)
      return HttpResponse.json(paraDisciplinaDto(disciplina), { status: 201 })
    }),
  ),

  http.post(
    `${API}/disciplinas/:id/estado`,
    protegido('curriculo:escrever', async ({ request, params }) => {
      const disciplina = db.disciplinas.find((d) => d.id === params.id)
      if (!disciplina) return problema(404, 'Disciplina não encontrada')
      const { estado } = (await request.json()) as { estado: S['EstadoDisciplina'] }
      disciplina.estado = estado === 'INACTIVA' ? 'INACTIVA' : 'ACTIVA'
      return HttpResponse.json(paraDisciplinaDto(disciplina))
    }),
  ),

  http.delete(
    `${API}/disciplinas/:id`,
    protegido('curriculo:escrever', ({ params }) => {
      const indice = db.disciplinas.findIndex((d) => d.id === params.id)
      if (indice < 0) return problema(404, 'Disciplina não encontrada')
      if (disciplinaEmUso(String(params.id)))
        return problema(409, 'Disciplina em uso', { code: 'DISCIPLINA_EM_USO' })
      db.disciplinas.splice(indice, 1)
      return HttpResponse.json({})
    }),
  ),

  http.get(
    `${API}/planos`,
    protegido('curriculo:ler', ({ request }) => {
      const classeId = new URL(request.url).searchParams.get('classeId')
      return HttpResponse.json(
        db.planos
          .filter((p) => p.classeId === classeId)
          .sort((a, b) => b.versao - a.versao)
          .map(paraPlanoResumo) satisfies S['PlanoResumoDto'][],
      )
    }),
  ),

  http.get(
    `${API}/planos/:id`,
    protegido('curriculo:ler', ({ params }) => {
      const plano = db.planos.find((p) => p.id === params.id)
      if (!plano) return problema(404, 'Plano não encontrado')
      return respostaPlano(plano)
    }),
  ),

  http.post(
    `${API}/planos/:id/linhas`,
    protegido('curriculo:escrever', async ({ request, params }) => {
      const { plano, erro } = planoEditavel(request, String(params.id))
      if (erro) return erro
      const corpo = (await request.json()) as S['LinhaPlanoAlteracaoDto'] & { disciplinaId: string }
      const disciplina = db.disciplinas.find((d) => d.id === corpo.disciplinaId)
      if (!disciplina || disciplina.estado !== 'ACTIVA') {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'disciplinaId', mensagem: 'Escolha uma disciplina activa.' }],
        })
      }
      if (!horasValidas(corpo.horasSemanais)) return erroHoras()
      if (!plano.linhas.some((l) => l.disciplinaId === disciplina.id)) {
        plano.linhas.push({ disciplinaId: disciplina.id, horasSemanais: corpo.horasSemanais })
        plano.revisao++
      }
      return respostaPlano(plano)
    }),
  ),

  http.patch(
    `${API}/planos/:id/linhas/:disciplinaId`,
    protegido('curriculo:escrever', async ({ request, params }) => {
      const { plano, erro } = planoEditavel(request, String(params.id))
      if (erro) return erro
      const linha = plano.linhas.find((l) => l.disciplinaId === params.disciplinaId)
      if (!linha) return problema(404, 'Disciplina fora do plano')
      const { horasSemanais } = (await request.json()) as S['LinhaPlanoAlteracaoDto']
      if (!horasValidas(horasSemanais)) return erroHoras()
      linha.horasSemanais = horasSemanais
      plano.revisao++
      return respostaPlano(plano)
    }),
  ),

  http.delete(
    `${API}/planos/:id/linhas/:disciplinaId`,
    protegido('curriculo:escrever', ({ request, params }) => {
      const { plano, erro } = planoEditavel(request, String(params.id))
      if (erro) return erro
      plano.linhas = plano.linhas.filter((l) => l.disciplinaId !== params.disciplinaId)
      plano.revisao++
      return respostaPlano(plano)
    }),
  ),

  http.post(
    `${API}/planos/:id/nova-versao`,
    protegido('curriculo:escrever', ({ params }) => {
      const base = db.planos.find((p) => p.id === params.id)
      if (!base) return problema(404, 'Plano não encontrado')
      const existente = db.planos.find(
        (p) => p.classeId === base.classeId && p.estado === 'RASCUNHO',
      )
      if (existente) {
        return problema(409, 'Rascunho existente', {
          code: 'RASCUNHO_EXISTENTE',
          planoId: existente.id,
        })
      }
      if (base.estado !== 'VIGENTE') {
        return problema(409, 'Só a partir do vigente', { code: 'PLANO_NAO_EDITAVEL' })
      }
      const versao =
        Math.max(...db.planos.filter((p) => p.classeId === base.classeId).map((p) => p.versao)) + 1
      const rascunho: Plano = {
        id: `p-${base.classeId}-${versao}`,
        classeId: base.classeId,
        versao,
        estado: 'RASCUNHO',
        publicadoEm: null,
        linhas: base.linhas.map((l) => ({ ...l })),
        revisao: 1,
      }
      db.planos.push(rascunho)
      return HttpResponse.json(paraPlanoDto(rascunho), {
        status: 201,
        headers: { ETag: etag(rascunho.revisao) },
      })
    }),
  ),

  http.post(
    `${API}/planos/:id/publicar`,
    protegido('curriculo:escrever', ({ request, params }) => {
      const { plano, erro } = planoEditavel(request, String(params.id))
      if (erro) return erro
      if (!plano.linhas.length) {
        return problema(422, 'Plano vazio', {
          errors: [{ campo: 'linhas', mensagem: 'O plano precisa de pelo menos uma disciplina.' }],
        })
      }
      for (const outro of db.planos) {
        if (outro.classeId === plano.classeId && outro.estado === 'VIGENTE')
          outro.estado = 'ARQUIVADO'
      }
      plano.estado = 'VIGENTE'
      plano.publicadoEm = new Date().toISOString().slice(0, 10)
      plano.revisao++
      return respostaPlano(plano)
    }),
  ),
  // ---------------------------------------------------------------- calendário
  http.get(
    `${API}/anos-lectivos/:id/calendario`,
    protegido('calendario:ler', ({ params }) => {
      const id = String(params.id)
      if (!anosLectivos.some((a) => a.id === id)) return problema(404, 'Ano lectivo não encontrado')
      return HttpResponse.json({
        anoLectivoId: id,
        trimestres: db.trimestres
          .filter((t) => t.anoLectivoId === id)
          .map(({ anoLectivoId: _, ...t }) => t),
        eventos: db.eventos
          .filter((e) => e.anoLectivoId === id)
          .sort((a, b) => a.inicio.localeCompare(b.inicio))
          .map(({ anoLectivoId: _, ...e }) => e),
      } satisfies S['CalendarioDto'])
    }),
  ),

  http.post(
    `${API}/anos-lectivos/:id/eventos`,
    protegido('calendario:escrever', async ({ request, params }) => {
      const ano = anosLectivos.find((a) => a.id === params.id)
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      if (anoEncerrado(ano.id)) return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      const corpo = (await request.json()) as S['NovoEventoDto']
      const titulo = corpo.titulo?.trim() ?? ''
      const erros = [
        ...(titulo.length < 3 ? [{ campo: 'titulo', mensagem: 'Escreva o nome do evento.' }] : []),
        ...(!['DATA_CHAVE', 'INTERRUPCAO', 'EVENTO'].includes(corpo.tipo)
          ? [{ campo: 'tipo', mensagem: 'Escolha o tipo de evento.' }]
          : []),
        ...(corpo.inicio < ano.dataInicio || corpo.inicio > ano.dataFim
          ? [{ campo: 'inicio', mensagem: 'A data tem de estar dentro do ano lectivo.' }]
          : []),
        ...(corpo.fim < corpo.inicio || corpo.fim > ano.dataFim
          ? [
              {
                campo: 'fim',
                mensagem: 'O fim tem de ser depois do início e dentro do ano lectivo.',
              },
            ]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const evento = {
        id: novoId('ev-'),
        anoLectivoId: ano.id,
        titulo,
        tipo: corpo.tipo,
        inicio: corpo.inicio,
        fim: corpo.fim,
        fixo: false,
      }
      db.eventos.push(evento)
      const { anoLectivoId: _, ...dto } = evento
      return HttpResponse.json(dto satisfies S['EventoDto'], { status: 201 })
    }),
  ),

  http.delete(
    `${API}/eventos/:id`,
    protegido('calendario:escrever', ({ params }) => {
      const indice = db.eventos.findIndex((e) => e.id === params.id)
      if (indice < 0) return problema(404, 'Evento não encontrado')
      const evento = db.eventos[indice]!
      if (evento.fixo) return problema(409, 'Evento fixo', { code: 'EVENTO_FIXO' })
      if (anoEncerrado(evento.anoLectivoId)) {
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      }
      db.eventos.splice(indice, 1)
      return HttpResponse.json({})
    }),
  ),
]
