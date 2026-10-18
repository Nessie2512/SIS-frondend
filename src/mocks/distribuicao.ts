import { http, HttpResponse } from 'msw'
import { auditar } from './administracao'
import { API, anoEncerrado, idempotente, problema, protegido, utilizadorDo, type S } from './apoio'
import { contarInscritos, db, novoId, paraTarefaDto, type Tarefa } from './db'

/**
 * Distribuição automática por turmas (guia 2.3, 6.3): escolher o critério, simular, ajustar à
 * mão e confirmar. Só matrículas confirmadas e sem turma; as turmas cheias não recebem mais.
 */

function simular(
  anoLectivoId: string,
  classeId: string,
  criterio: S['CriterioDistribuicao'],
): S['DistribuicaoDto'] {
  const turmas = db.turmas
    .filter(
      (t) => t.anoLectivoId === anoLectivoId && t.classeId === classeId && t.estado === 'ACTIVA',
    )
    .sort((a, b) => a.designacao.localeCompare(b.designacao, 'pt'))
  const sexoDe = (estudanteId: string) => db.estudantes.find((e) => e.id === estudanteId)!.sexo
  const estado = turmas.map((t) => {
    const daTurma = db.matriculas.filter((m) => m.turmaId === t.id && m.estado !== 'ANULADA')
    return {
      turma: t,
      inscritos: daTurma.length,
      depois: daTurma.length,
      porSexo: {
        M: daTurma.filter((m) => sexoDe(m.estudanteId) === 'M').length,
        F: daTurma.filter((m) => sexoDe(m.estudanteId) === 'F').length,
      },
    }
  })
  const semTurma = db.matriculas
    .filter(
      (m) =>
        m.anoLectivoId === anoLectivoId &&
        m.classeId === classeId &&
        !m.turmaId &&
        (m.estado === 'CONFIRMADA' || m.estado === 'PENDENTE'),
    )
    .map((m) => ({ m, e: db.estudantes.find((x) => x.id === m.estudanteId)! }))
    .sort((a, b) => a.e.nome.localeCompare(b.e.nome, 'pt'))

  const propostas: S['DistribuicaoDto']['propostas'] = []
  const excluidos: S['DistribuicaoDto']['excluidos'] = []
  for (const { m, e } of semTurma) {
    const base = {
      matriculaId: m.id,
      estudanteId: e.id,
      nome: e.nome,
      numeroProcesso: e.numeroProcesso,
    }
    if (m.estado !== 'CONFIRMADA') {
      excluidos.push({ ...base, motivo: 'MATRICULA_POR_CONFIRMAR' })
      continue
    }
    const livres = estado.filter((x) => x.depois < x.turma.lotacaoMaxima)
    if (!livres.length) {
      excluidos.push({ ...base, motivo: 'SEM_VAGAS' })
      continue
    }
    const vagas = (x: (typeof estado)[number]) => x.turma.lotacaoMaxima - x.depois
    const destino =
      criterio === 'ALFABETICA'
        ? livres[0]!
        : criterio === 'SEXO'
          ? [...livres].sort(
              (a, b) => a.porSexo[e.sexo] - b.porSexo[e.sexo] || vagas(b) - vagas(a),
            )[0]!
          : [...livres].sort((a, b) => vagas(b) - vagas(a))[0]!
    destino.depois++
    destino.porSexo[e.sexo]++
    propostas.push({ ...base, sexo: e.sexo, turmaId: destino.turma.id })
  }
  return {
    criterio,
    turmas: estado.map((x) => ({
      turmaId: x.turma.id,
      designacao: x.turma.designacao,
      lotacao: x.turma.lotacaoMaxima,
      inscritos: x.inscritos,
    })),
    propostas,
    excluidos,
  }
}

export const handlersDistribuicao = [
  http.post(
    `${API}/distribuicoes/simular`,
    protegido('turmas:escrever', async ({ request }) => {
      const { anoLectivoId, classeId, criterio } =
        (await request.json()) as S['SimularDistribuicaoDto']
      if (anoEncerrado(anoLectivoId))
        return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
      return HttpResponse.json(simular(anoLectivoId, classeId, criterio))
    }),
  ),

  http.post(
    `${API}/distribuicoes/aplicar`,
    protegido('turmas:escrever', async ({ request }) => {
      const { anoLectivoId, classeId, inscricoes } =
        (await request.json()) as S['AplicarDistribuicaoDto']
      return idempotente(request, () => {
        if (anoEncerrado(anoLectivoId))
          return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
        const quem = utilizadorDo(request)!
        const linhas = ['Processo;Nome;Turma']
        const avisos: { linha: number; mensagem: string }[] = []
        let n = 0
        for (const pedido of inscricoes) {
          const m = db.matriculas.find((x) => x.id === pedido.matriculaId)
          const turma = db.turmas.find((t) => t.id === pedido.turmaId)
          const e = m && db.estudantes.find((x) => x.id === m.estudanteId)
          const nome = e?.nome ?? pedido.matriculaId
          const motivo =
            !m || !turma || !e
              ? 'não encontrado'
              : m.estado !== 'CONFIRMADA'
                ? 'a matrícula não está confirmada'
                : m.turmaId
                  ? 'já está numa turma'
                  : turma.classeId !== m.classeId || turma.estado !== 'ACTIVA'
                    ? 'a turma não serve para esta matrícula'
                    : contarInscritos(turma.id) >= turma.lotacaoMaxima
                      ? `${turma.designacao} ficou cheia entretanto`
                      : null
          if (motivo) {
            avisos.push({
              linha: avisos.length + 1,
              mensagem: `${nome}: ${motivo}; não foi inscrito.`,
            })
            continue
          }
          m!.turmaId = turma!.id
          db.percurso.push({
            id: novoId('p'),
            estudanteId: e!.id,
            data: new Date().toISOString(),
            anoLectivo: '2026/2027',
            tipo: 'INSCRICAO',
            descricao: `Inscrito na turma ${turma!.designacao}`,
            autor: quem.nome,
            rectificaId: null,
            motivo: null,
          })
          linhas.push(`${e!.numeroProcesso};${e!.nome};${turma!.designacao}`)
          n++
        }
        const tarefa: Tarefa = {
          id: novoId('t'),
          tipo: 'DISTRIBUICAO',
          parametros: { anoLectivoId, classeId },
          titulo: `Distribuição por turmas: ${n} ${n === 1 ? 'inscrito' : 'inscritos'}`,
          utilizadorId: quem.id,
          inicio: Date.now(),
          duracao: import.meta.env.MODE === 'test' ? 0 : 3000,
          falha: false,
          linhas,
          avisos,
        }
        db.tarefas.push(tarefa)
        auditar(
          quem.nome,
          'ALTERAR',
          'Turmas',
          `Distribuição automática: ${n} estudantes inscritos`,
        )
        return HttpResponse.json(paraTarefaDto(tarefa), { status: 202 })
      })
    }),
  ),
]
