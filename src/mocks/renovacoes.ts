import { http, HttpResponse } from 'msw'
import { auditar } from './administracao'
import { API, idempotente, problema, protegido, utilizadorDo, type S } from './apoio'
import { anosLectivos, classes, db, novoId, paraTarefaDto, type Tarefa } from './db'

/**
 * Renovação de matrículas em lote (guia 2.3, 5.7): simular, rever os excluídos, ajustar à mão,
 * confirmar e acompanhar a tarefa. Aprovados passam à classe seguinte; reprovados repetem.
 */

type Simulacao = S['SimulacaoRenovacaoDto']

const classeSeguinte = (classeId: string) => {
  const actual = classes.find((c) => c.id === classeId)!
  return classes.find((c) => c.ordem === actual.ordem + 1)
}

function simular(origemId: string, destinoId: string, id: string): Simulacao {
  const origem = anosLectivos.find((a) => a.id === origemId)!
  const destino = anosLectivos.find((a) => a.id === destinoId)!
  const jaNoDestino = new Set(
    db.matriculas
      .filter((m) => m.anoLectivoId === destinoId && m.estado !== 'ANULADA')
      .map((m) => m.estudanteId),
  )
  const incluidos: Simulacao['incluidos'] = []
  const excluidos: Simulacao['excluidos'] = []
  const daOrigem = db.matriculas.filter(
    (m) => m.anoLectivoId === origemId && (m.estado === 'CONFIRMADA' || m.estado === 'CONCLUIDA'),
  )
  for (const m of daOrigem) {
    const e = db.estudantes.find((x) => x.id === m.estudanteId)!
    const classeActual = classes.find((c) => c.id === m.classeId)!
    const base = {
      matriculaId: m.id,
      estudanteId: e.id,
      nome: e.nome,
      numeroProcesso: e.numeroProcesso,
      classeActual: classeActual.designacao,
    }
    const excluir = (motivo: S['MotivoExclusao']) => excluidos.push({ ...base, motivo })
    if (e.estado !== 'ACTIVO') excluir('ESTUDANTE_INACTIVO')
    else if (jaNoDestino.has(e.id)) excluir('JA_MATRICULADO')
    else if (!m.resultado) excluir('SEM_RESULTADO')
    else {
      const destinoClasse = m.resultado === 'APROVADO' ? classeSeguinte(m.classeId) : classeActual
      if (!destinoClasse) excluir('FIM_DE_CICLO')
      else
        incluidos.push({
          ...base,
          resultado: m.resultado,
          classeDestinoId: destinoClasse.id,
          classeDestino: destinoClasse.designacao,
        })
    }
  }
  const ordenar = <T extends { nome: string }>(l: T[]) =>
    l.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  const resumo = classes
    .map((c) => {
      const daClasse = incluidos.filter((i) => i.classeDestinoId === c.id)
      return {
        classeId: c.id,
        classe: c.designacao,
        total: daClasse.length,
        sobem: daClasse.filter((i) => i.resultado === 'APROVADO').length,
        repetem: daClasse.filter((i) => i.resultado === 'REPROVADO').length,
      }
    })
    .filter((r) => r.total > 0)
  return {
    id,
    anoOrigemId: origem.id,
    anoOrigem: origem.designacao,
    anoDestinoId: destino.id,
    anoDestino: destino.designacao,
    resumo,
    incluidos: ordenar(incluidos),
    excluidos: ordenar(excluidos),
  }
}

export const handlersRenovacoes = [
  http.post(
    `${API}/renovacoes/simular`,
    protegido('matriculas:escrever', async ({ request }) => {
      const { anoDestinoId } = (await request.json()) as S['SimularRenovacaoDto']
      const destino = anosLectivos.find((a) => a.id === anoDestinoId)
      if (!destino) return problema(404, 'Ano lectivo não encontrado')
      if (destino.estado !== 'PLANEADO') {
        return problema(409, 'Estado inválido', {
          detail: 'A renovação faz-se para o ano seguinte, ainda planeado.',
        })
      }
      if (db.renovacoes.some((r) => r.anoDestinoId === destino.id && r.aplicada)) {
        return problema(409, 'Já renovado', { code: 'RENOVACAO_APLICADA' })
      }
      const origem =
        anosLectivos.find((a) => a.estado === 'EM_CURSO') ??
        [...anosLectivos]
          .filter((a) => a.dataFim < destino.dataInicio)
          .sort((a, b) => b.dataFim.localeCompare(a.dataFim))[0]
      if (!origem) return problema(409, 'Sem ano de origem')
      const id = novoId('ren')
      const simulacao = simular(origem.id, destino.id, id)
      db.renovacoes.push({
        id,
        anoOrigemId: origem.id,
        anoDestinoId: destino.id,
        aplicada: false,
        incluidos: simulacao.incluidos.map((i) => i.matriculaId),
      })
      return HttpResponse.json(simulacao)
    }),
  ),

  http.post(
    `${API}/renovacoes/:id/aplicar`,
    protegido('matriculas:escrever', async ({ request, params }) => {
      const renovacao = db.renovacoes.find((r) => r.id === params.id)
      if (!renovacao) return problema(404, 'Simulação não encontrada')
      const { excluir } = (await request.json()) as S['AplicarRenovacaoDto']
      return idempotente(request, () => {
        if (db.renovacoes.some((r) => r.anoDestinoId === renovacao.anoDestinoId && r.aplicada)) {
          return problema(409, 'Já renovado', { code: 'RENOVACAO_APLICADA' })
        }
        const destino = anosLectivos.find((a) => a.id === renovacao.anoDestinoId)!
        // Volta a simular: entre a simulação e a confirmação os dados podem ter mudado
        const actual = simular(renovacao.anoOrigemId, renovacao.anoDestinoId, renovacao.id)
        const retirados = new Set(excluir ?? [])
        const quem = utilizadorDo(request)!
        const linhas = ['Processo;Nome;De;Para;Resultado']
        const avisos: { linha: number; mensagem: string }[] = []
        // Quem a simulação incluía e entretanto deixou de poder renovar é avisado por linha
        const incluidosAgora = new Set(actual.incluidos.map((i) => i.matriculaId))
        for (const matriculaId of renovacao.incluidos) {
          if (retirados.has(matriculaId) || incluidosAgora.has(matriculaId)) continue
          const saiu = actual.excluidos.find((x) => x.matriculaId === matriculaId)
          avisos.push({
            linha: avisos.length + 1,
            mensagem: `${saiu?.nome ?? matriculaId}: ${saiu?.motivo === 'JA_MATRICULADO' ? `já tinha matrícula em ${destino.designacao}` : 'deixou de poder renovar'}; não foi renovado.`,
          })
        }
        let n = 0
        for (const i of actual.incluidos) {
          if (retirados.has(i.matriculaId) || !incluidosAgora.has(i.matriculaId)) continue
          db.matriculas.push({
            id: novoId('m'),
            estudanteId: i.estudanteId,
            anoLectivoId: destino.id,
            classeId: i.classeDestinoId,
            turmaId: null,
            estado: 'CONFIRMADA',
            criadaEm: new Date().toISOString(),
            resultado: null,
          })
          db.percurso.push({
            id: novoId('p'),
            estudanteId: i.estudanteId,
            data: new Date().toISOString(),
            anoLectivo: destino.designacao,
            tipo: 'MATRICULA',
            descricao: `Matrícula renovada na ${i.classeDestino}${i.resultado === 'REPROVADO' ? ' (repete)' : ''}`,
            autor: quem.nome,
            rectificaId: null,
            motivo: null,
          })
          linhas.push(
            `${i.numeroProcesso};${i.nome};${i.classeActual};${i.classeDestino};${i.resultado}`,
          )
          n++
        }
        renovacao.aplicada = true
        const tarefa: Tarefa = {
          id: novoId('t'),
          tipo: 'RENOVACAO',
          parametros: { anoLectivoId: destino.id },
          titulo: `Renovação para ${destino.designacao}: ${n} matrículas`,
          utilizadorId: quem.id,
          inicio: Date.now(),
          duracao: import.meta.env.MODE === 'test' ? 0 : 5000,
          falha: false,
          linhas,
          avisos,
        }
        db.tarefas.push(tarefa)
        auditar(
          quem.nome,
          'CRIAR',
          'Matrícula',
          `Renovação para ${destino.designacao}: ${n} matrículas`,
        )
        return HttpResponse.json(paraTarefaDto(tarefa), { status: 202 })
      })
    }),
  ),
]
