import { http, HttpResponse } from 'msw'
import { TIPOS_DOCUMENTO_PROFESSOR, type Professor } from './academico'
import { API, paginar, problema, protegido, type S } from './apoio'
import { db, normalizar } from './db'

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

export const disciplinaEmUso = (disciplinaId: string) =>
  db.planos.some(
    (p) => p.estado === 'VIGENTE' && p.linhas.some((l) => l.disciplinaId === disciplinaId),
  )

function paraDisciplinaDto(d: (typeof db.disciplinas)[number]): S['DisciplinaDto'] {
  return { ...d, emUso: disciplinaEmUso(d.id) }
}

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
]
