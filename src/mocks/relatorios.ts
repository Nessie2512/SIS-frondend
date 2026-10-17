import { http, HttpResponse } from 'msw'
import { API, idempotente, problema, protegido, utilizadorDo, type S } from './apoio'
import {
  classePorId,
  classes,
  contarInscritos,
  db,
  novoId,
  paraTarefaDto,
  turmaPorId,
  type Tarefa,
} from './db'

/** Catálogo de relatórios (dados de exemplo). Cada pedido corre como tarefa longa. */
export const CATALOGO: S['RelatorioDto'][] = [
  {
    tipo: 'LISTA_NOMINAL',
    titulo: 'Lista nominal da turma',
    descricao: 'Estudantes inscritos numa turma, por ordem alfabética, com o número de processo.',
    parametro: 'TURMA',
    parametroObrigatorio: true,
    formato: 'CSV',
  },
  {
    tipo: 'MATRICULAS_POR_CLASSE',
    titulo: 'Matrículas por classe e estado',
    descricao: 'Quantas matrículas há em cada classe: confirmadas, a confirmar e sem turma.',
    parametro: 'CLASSE',
    parametroObrigatorio: false,
    formato: 'CSV',
  },
  {
    tipo: 'DOCUMENTOS_EM_FALTA',
    titulo: 'Documentos obrigatórios em falta',
    descricao: 'Estudantes com processo incompleto e os documentos que faltam a cada um.',
    parametro: 'CLASSE',
    parametroObrigatorio: false,
    formato: 'CSV',
  },
  {
    tipo: 'SEM_TURMA',
    titulo: 'Estudantes sem turma',
    descricao: 'Matriculados no ano que ainda não foram distribuídos por uma turma.',
    parametro: 'CLASSE',
    parametroObrigatorio: false,
    formato: 'CSV',
  },
  {
    tipo: 'OCUPACAO_TURMAS',
    titulo: 'Ocupação das turmas',
    descricao: 'Inscritos, lotação e vagas de cada turma do ano.',
    parametro: null,
    parametroObrigatorio: false,
    formato: 'CSV',
  },
  {
    tipo: 'CARGA_LECTIVA',
    titulo: 'Carga lectiva dos professores',
    descricao: 'Horas semanais atribuídas a cada professor e turmas que lecciona.',
    parametro: null,
    parametroObrigatorio: false,
    formato: 'CSV',
  },
]

const nomeDo = (estudanteId: string) => db.estudantes.find((e) => e.id === estudanteId)!

/** Conteúdo do resultado de uma tarefa, em CSV separado por ponto e vírgula. */
export function gerarCsv(tarefa: Tarefa): { nome: string; linhas: string[] } {
  const { anoLectivoId, turmaId, classeId } = tarefa.parametros
  const doAno = db.matriculas.filter(
    (m) =>
      m.anoLectivoId === anoLectivoId &&
      m.estado !== 'ANULADA' &&
      (!classeId || m.classeId === classeId),
  )
  if (tarefa.linhas)
    return { nome: `${tarefa.tipo.toLowerCase()}-${tarefa.id}.csv`, linhas: tarefa.linhas }
  switch (tarefa.tipo) {
    case 'LISTA_NOMINAL': {
      const turma = turmaPorId(turmaId ?? null)
      const linhas = db.matriculas
        .filter((m) => m.turmaId === turmaId)
        .map((m) => nomeDo(m.estudanteId))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
        .map((e, i) => `${i + 1};${e.numeroProcesso};${e.nome}`)
      const sufixo = turma?.designacao.replace(/\W+/g, '') ?? 'turma'
      return { nome: `lista-nominal-${sufixo}.csv`, linhas: ['N.º;Processo;Nome', ...linhas] }
    }
    case 'MATRICULAS_POR_CLASSE': {
      const linhas = classes
        .filter((c) => !classeId || c.id === classeId)
        .map((c) => {
          const daClasse = doAno.filter((m) => m.classeId === c.id)
          const confirmadas = daClasse.filter((m) => m.estado === 'CONFIRMADA').length
          const pendentes = daClasse.filter((m) => m.estado === 'PENDENTE').length
          const semTurma = daClasse.filter((m) => !m.turmaId).length
          return `${c.designacao};${daClasse.length};${confirmadas};${pendentes};${semTurma}`
        })
      return {
        nome: 'matriculas-por-classe.csv',
        linhas: ['Classe;Total;Confirmadas;A confirmar;Sem turma', ...linhas],
      }
    }
    case 'DOCUMENTOS_EM_FALTA': {
      const linhas = doAno.flatMap((m) => {
        const falta = db.documentos.filter(
          (d) => d.estudanteId === m.estudanteId && d.obrigatorio && d.estado === 'EM_FALTA',
        )
        if (!falta.length) return []
        const e = nomeDo(m.estudanteId)
        return [
          `${e.numeroProcesso};${e.nome};${classePorId(m.classeId).designacao};${falta.map((d) => d.designacao).join(', ')}`,
        ]
      })
      return {
        nome: 'documentos-em-falta.csv',
        linhas: ['Processo;Nome;Classe;Documentos em falta', ...linhas],
      }
    }
    case 'SEM_TURMA': {
      const linhas = doAno
        .filter((m) => !m.turmaId)
        .map((m) => {
          const e = nomeDo(m.estudanteId)
          return `${e.numeroProcesso};${e.nome};${classePorId(m.classeId).designacao}`
        })
      return { nome: 'estudantes-sem-turma.csv', linhas: ['Processo;Nome;Classe', ...linhas] }
    }
    case 'OCUPACAO_TURMAS': {
      const linhas = db.turmas
        .filter((t) => t.anoLectivoId === anoLectivoId)
        .map((t) => {
          const inscritos = contarInscritos(t.id)
          return `${t.designacao};${t.lotacaoMaxima};${inscritos};${Math.max(0, t.lotacaoMaxima - inscritos)}`
        })
      return {
        nome: 'ocupacao-das-turmas.csv',
        linhas: ['Turma;Lotação;Inscritos;Vagas', ...linhas],
      }
    }
    case 'CARGA_LECTIVA': {
      const linhas = db.professores.map((p) => {
        const doProf = db.atribuicoes.filter(
          (a) => a.ate === null && a.professorId === p.id && a.anoLectivoId === anoLectivoId,
        )
        const horas = doProf.reduce((s, a) => s + a.horasSemanais, 0)
        const turmas = new Set(doProf.map((a) => turmaPorId(a.turmaId)?.designacao)).size
        return `${p.numeroAgente};${p.nome};${horas};${turmas}`
      })
      return {
        nome: 'carga-lectiva.csv',
        linhas: ['Agente;Nome;Horas semanais;Turmas', ...linhas],
      }
    }
  }
  return { nome: `${tarefa.tipo.toLowerCase()}.csv`, linhas: [] }
}

function paraExportacao(t: Tarefa): S['ExportacaoDto'] {
  const dto = paraTarefaDto(t)
  return {
    id: t.id,
    tipo: t.tipo as S['TipoRelatorio'],
    titulo: t.titulo,
    pedidoEm: new Date(t.inicio).toISOString(),
    estado: dto.estado,
    progresso: dto.progresso,
    resultadoUrl: dto.resultadoUrl,
  }
}

export const handlersRelatorios = [
  http.get(
    `${API}/relatorios`,
    protegido(null, () => HttpResponse.json(CATALOGO)),
  ),

  http.get(
    `${API}/relatorios/exportacoes`,
    protegido(null, ({ request }) => {
      const utilizador = utilizadorDo(request)!
      const anoLectivoId = new URL(request.url).searchParams.get('anoLectivoId')
      return HttpResponse.json(
        db.tarefas
          .filter(
            (t) =>
              t.tipo !== 'RENOVACAO' &&
              t.utilizadorId === utilizador.id &&
              t.parametros.anoLectivoId === anoLectivoId,
          )
          .sort((a, b) => b.inicio - a.inicio)
          .slice(0, 20)
          .map(paraExportacao) satisfies S['ExportacaoDto'][],
      )
    }),
  ),

  http.post(
    `${API}/relatorios/:tipo`,
    protegido(null, async ({ request, params }) => {
      const relatorio = CATALOGO.find((r) => r.tipo === params.tipo)
      if (!relatorio) return problema(404, 'Relatório desconhecido')
      const corpo = (await request.json()) as S['PedidoRelatorioDto']
      const turma = corpo.turmaId ? turmaPorId(corpo.turmaId) : undefined
      const classe = corpo.classeId ? classes.find((c) => c.id === corpo.classeId) : undefined
      if (relatorio.parametro === 'TURMA' && relatorio.parametroObrigatorio && !turma) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'turmaId', mensagem: 'Escolha a turma.' }],
        })
      }
      return idempotente(request, () => {
        const detalhe = turma ? ` — ${turma.designacao}` : classe ? ` — ${classe.designacao}` : ''
        const tarefa: Tarefa = {
          id: novoId('t'),
          tipo: relatorio.tipo,
          parametros: {
            anoLectivoId: corpo.anoLectivoId,
            turmaId: turma?.id,
            classeId: classe?.id,
          },
          titulo: `${relatorio.titulo}${detalhe}`,
          utilizadorId: utilizadorDo(request)!.id,
          inicio: Date.now(),
          duracao: import.meta.env.MODE === 'test' ? 0 : 4000,
          falha: false,
        }
        db.tarefas.push(tarefa)
        return HttpResponse.json(paraTarefaDto(tarefa), { status: 202 })
      })
    }),
  ),
]
