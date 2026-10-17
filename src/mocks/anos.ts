import { http, HttpResponse } from 'msw'
import { emVigor } from './academico'
import { auditar } from './administracao'
import { API, latencia, problema, protegido, utilizadorDo, type S } from './apoio'
import { criarCalendario } from './calendario'
import { anosLectivos, classes, db, novoId } from './db'

/**
 * Ciclo de vida do ano lectivo (guia 2.2, 2.3): abrir o ano seguinte por etapas, activar,
 * encerrar (com pendências bloqueantes e confirmação digitada) e reabrir com justificação.
 */

const anoPorId = (id: string) => anosLectivos.find((a) => a.id === id)
const emCurso = () => anosLectivos.find((a) => a.estado === 'EM_CURSO')
const designacaoDaClasse = (id: string) => classes.find((c) => c.id === id)!.designacao

function percurso(estudanteId: string, anoLectivo: string, descricao: string, autor: string) {
  db.percurso.push({
    id: novoId('p'),
    estudanteId,
    data: new Date().toISOString(),
    anoLectivo,
    tipo: 'RESULTADO',
    descricao,
    autor,
    rectificaId: null,
    motivo: null,
  })
}

// ---------------------------------------------------------------------------
// Encerramento
// ---------------------------------------------------------------------------
function encerramentoDe(anoId: string): S['EncerramentoDto'] {
  const doAno = db.matriculas.filter((m) => m.anoLectivoId === anoId)
  const pendentes = doAno.filter((m) => m.estado === 'PENDENTE').length
  const confirmadas = doAno.filter((m) => m.estado === 'CONFIRMADA')
  const semTurma = confirmadas.filter((m) => !m.turmaId).length
  const turmas = db.turmas
    .filter((t) => t.anoLectivoId === anoId)
    .map((t) => {
      const daTurma = confirmadas.filter((m) => m.turmaId === t.id)
      return {
        turmaId: t.id,
        designacao: t.designacao,
        total: daTurma.length,
        emFalta: daTurma.filter((m) => !m.resultado).length,
      }
    })
    .filter((t) => t.emFalta > 0)
  const resultadosEmFalta = turmas.reduce((s, t) => s + t.emFalta, 0)
  const pendencias: S['EncerramentoDto']['pendencias'] = [
    { tipo: 'MATRICULAS_PENDENTES', quantidade: pendentes, bloqueante: true },
    { tipo: 'CONFIRMADAS_SEM_TURMA', quantidade: semTurma, bloqueante: true },
    { tipo: 'RESULTADOS_EM_FALTA', quantidade: resultadosEmFalta, bloqueante: true },
  ]
  return {
    anoLectivoId: anoId,
    pendencias,
    turmasSemResultados: turmas,
    podeEncerrar: pendencias.every((p) => !p.bloqueante || p.quantidade === 0),
  }
}

// ---------------------------------------------------------------------------
// Abertura
// ---------------------------------------------------------------------------
function aberturaDe(anoId: string): S['AberturaDto'] {
  const ano = anoPorId(anoId)!
  const trimestres = db.trimestres.filter((t) => t.anoLectivoId === anoId).length
  const turmas = db.turmas.filter((t) => t.anoLectivoId === anoId)
  const matriculas = db.matriculas.filter((m) => m.anoLectivoId === anoId && m.estado !== 'ANULADA')
  const semTurma = matriculas.filter((m) => !m.turmaId).length
  const semDocente = turmas.reduce((soma, t) => {
    const plano = db.planos.find((p) => p.classeId === t.classeId && p.estado === 'VIGENTE')
    const comDocente = new Set(
      db.atribuicoes.filter((a) => a.turmaId === t.id && emVigor(a)).map((a) => a.disciplinaId),
    )
    return soma + (plano?.linhas.filter((l) => !comDocente.has(l.disciplinaId)).length ?? 0)
  }, 0)
  const renovada = db.renovacoes.some((r) => r.anoDestinoId === anoId && r.aplicada)
  const outro = emCurso()
  const feito = (sim: boolean): S['EstadoEtapa'] => (sim ? 'FEITA' : 'POR_FAZER')
  const etapas: S['EtapaAberturaDto'][] = [
    { id: 'CRIAR', estado: 'FEITA', quantidade: null },
    { id: 'CALENDARIO', estado: feito(trimestres > 0), quantidade: trimestres },
    { id: 'TURMAS', estado: feito(turmas.length > 0), quantidade: turmas.length },
    { id: 'RENOVACAO', estado: feito(renovada), quantidade: null },
    { id: 'MATRICULAS', estado: 'OPCIONAL', quantidade: matriculas.length },
    {
      id: 'DISTRIBUICAO',
      estado: matriculas.length === 0 ? 'POR_FAZER' : feito(semTurma === 0),
      quantidade: matriculas.length === 0 ? null : semTurma,
    },
    {
      id: 'DOCENTES',
      estado: turmas.length === 0 ? 'POR_FAZER' : feito(semDocente === 0),
      quantidade: turmas.length === 0 ? null : semDocente,
    },
    {
      id: 'ACTIVAR',
      estado: ano.estado === 'EM_CURSO' ? 'FEITA' : outro ? 'BLOQUEADA' : 'POR_FAZER',
      quantidade: null,
    },
  ]
  return { anoLectivoId: anoId, etapas, anoEmCurso: outro?.designacao ?? null }
}

export const handlersAnos = [
  http.get(
    `${API}/anos-lectivos/:id/encerramento`,
    protegido(null, ({ params }) => {
      const ano = anoPorId(String(params.id))
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      return HttpResponse.json(encerramentoDe(ano.id))
    }),
  ),

  http.post(
    `${API}/anos-lectivos/:id/encerrar`,
    protegido('anos:gerir', async ({ request, params }) => {
      const ano = anoPorId(String(params.id))
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      if (ano.estado !== 'EM_CURSO') {
        return problema(409, 'Estado inválido', { detail: 'Só um ano em curso se encerra.' })
      }
      const { confirmacao } = (await request.json()) as S['EncerrarAnoDto']
      if (confirmacao?.trim() !== ano.designacao) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'confirmacao', mensagem: `Escreva ${ano.designacao} para confirmar.` }],
        })
      }
      if (!encerramentoDe(ano.id).podeEncerrar) {
        return problema(409, 'Pendências', { code: 'PENDENCIAS_POR_RESOLVER' })
      }
      await latencia(900)
      const quem = utilizadorDo(request)!.nome
      for (const m of db.matriculas) {
        if (m.anoLectivoId !== ano.id || m.estado !== 'CONFIRMADA' || !m.resultado) continue
        m.estado = 'CONCLUIDA'
        const classe = designacaoDaClasse(m.classeId)
        const texto = m.resultado === 'APROVADO' ? 'Aprovado' : 'Reprovado'
        percurso(m.estudanteId, ano.designacao, `${texto} na ${classe}`, quem)
      }
      for (const t of db.turmas) if (t.anoLectivoId === ano.id) t.estado = 'ENCERRADA'
      ano.estado = 'ENCERRADO'
      auditar(quem, 'ALTERAR', 'Ano lectivo', `${ano.designacao}: encerrado`)
      return HttpResponse.json(ano)
    }),
  ),

  http.post(
    `${API}/anos-lectivos/:id/reabrir`,
    protegido('anos:gerir', async ({ request, params }) => {
      const ano = anoPorId(String(params.id))
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      if (ano.estado !== 'ENCERRADO') {
        return problema(409, 'Estado inválido', { detail: 'Só um ano encerrado se reabre.' })
      }
      const { motivo } = (await request.json()) as S['ReabrirAnoDto']
      if ((motivo?.trim().length ?? 0) < 10) {
        return problema(422, 'Dados inválidos', {
          errors: [
            { campo: 'motivo', mensagem: 'Explique porque reabre (pelo menos 10 caracteres).' },
          ],
        })
      }
      if (emCurso()) {
        return problema(409, 'Outro ano em curso', { code: 'OUTRO_ANO_EM_CURSO' })
      }
      await latencia(600)
      for (const m of db.matriculas) {
        if (m.anoLectivoId === ano.id && m.estado === 'CONCLUIDA') m.estado = 'CONFIRMADA'
      }
      for (const t of db.turmas) if (t.anoLectivoId === ano.id) t.estado = 'ACTIVA'
      ano.estado = 'EM_CURSO'
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Ano lectivo',
        `${ano.designacao}: reaberto (${motivo!.trim()})`,
      )
      return HttpResponse.json(ano)
    }),
  ),

  http.post(
    `${API}/anos-lectivos`,
    protegido('anos:gerir', async ({ request }) => {
      if (anosLectivos.some((a) => a.estado === 'PLANEADO')) {
        return problema(409, 'Já existe', { code: 'ANO_PLANEADO_EXISTENTE' })
      }
      const { dataInicio, dataFim } = (await request.json()) as S['NovoAnoLectivoDto']
      const ultimo = [...anosLectivos].sort((a, b) => b.dataFim.localeCompare(a.dataFim))[0]!
      const erros = [
        ...(!dataInicio || dataInicio <= ultimo.dataFim
          ? [
              {
                campo: 'dataInicio',
                mensagem: `Tem de começar depois de ${ultimo.dataFim.split('-').reverse().join('/')}.`,
              },
            ]
          : []),
        ...(!dataFim || !dataInicio || dataFim <= dataInicio
          ? [{ campo: 'dataFim', mensagem: 'Tem de terminar depois do início.' }]
          : []),
      ]
      if (erros.length) return problema(422, 'Dados inválidos', { errors: erros })
      const y = Number(dataInicio.slice(0, 4))
      const ano: S['AnoLectivoDto'] = {
        id: `ano-${y}`,
        designacao: `${y}/${y + 1}`,
        dataInicio,
        dataFim,
        estado: 'PLANEADO',
      }
      anosLectivos.push(ano)
      const { trimestres, eventos } = criarCalendario([ano])
      db.trimestres.push(...trimestres)
      db.eventos.push(...eventos.map((e) => ({ ...e, id: novoId('ev') })))
      auditar(utilizadorDo(request)!.nome, 'CRIAR', 'Ano lectivo', `${ano.designacao} (planeado)`)
      return HttpResponse.json(ano, { status: 201 })
    }),
  ),

  http.get(
    `${API}/anos-lectivos/:id/abertura`,
    protegido(null, ({ params }) => {
      const ano = anoPorId(String(params.id))
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      return HttpResponse.json(aberturaDe(ano.id))
    }),
  ),

  http.post(
    `${API}/anos-lectivos/:id/duplicar-turmas`,
    protegido('anos:gerir', ({ request, params }) => {
      const ano = anoPorId(String(params.id))
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      if (ano.estado !== 'PLANEADO') {
        return problema(409, 'Estado inválido', { detail: 'Só se prepara um ano planeado.' })
      }
      if (db.turmas.some((t) => t.anoLectivoId === ano.id)) {
        return problema(409, 'Já tem turmas', { detail: 'Este ano já tem turmas.' })
      }
      const origem = emCurso() ?? [...anosLectivos].filter((a) => a.id !== ano.id).at(-1)!
      const copiadas = db.turmas
        .filter((t) => t.anoLectivoId === origem.id)
        .map((t) => ({
          ...t,
          id: `${ano.id}${t.id.slice(origem.id.length)}`,
          anoLectivoId: ano.id,
          estado: 'ACTIVA' as const,
        }))
      db.turmas.push(...copiadas)
      const n = copiadas.length
      const de = origem.designacao
      auditar(
        utilizadorDo(request)!.nome,
        'CRIAR',
        'Turmas',
        `${ano.designacao}: ${n} turmas a partir de ${de}`,
      )
      return HttpResponse.json({ criadas: n, origem: de } satisfies S['DuplicarTurmasDto'])
    }),
  ),

  http.post(
    `${API}/anos-lectivos/:id/activar`,
    protegido('anos:gerir', async ({ request, params }) => {
      const ano = anoPorId(String(params.id))
      if (!ano) return problema(404, 'Ano lectivo não encontrado')
      if (ano.estado !== 'PLANEADO') {
        return problema(409, 'Estado inválido', { detail: 'Só um ano planeado se activa.' })
      }
      if (emCurso()) return problema(409, 'Outro ano em curso', { code: 'OUTRO_ANO_EM_CURSO' })
      await latencia(600)
      ano.estado = 'EM_CURSO'
      auditar(utilizadorDo(request)!.nome, 'ALTERAR', 'Ano lectivo', `${ano.designacao}: activado`)
      return HttpResponse.json(ano)
    }),
  ),
]
