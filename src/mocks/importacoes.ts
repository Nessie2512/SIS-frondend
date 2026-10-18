import { http, HttpResponse } from 'msw'
import { auditar } from './administracao'
import { anoEncerrado, API, idempotente, problema, protegido, utilizadorDo, type S } from './apoio'
import {
  anosLectivos,
  classePorId,
  classes,
  db,
  normalizar,
  novoId,
  paraTarefaDto,
  TIPOS_DOCUMENTO,
  type Tarefa,
} from './db'

/**
 * Importação de estudantes (guia 2.1, 5.7): o cliente já validou o ficheiro; o servidor volta a
 * verificar contra a base (duplicados, classes) e cria estudante, encarregado e matrícula
 * PENDENTE (os documentos ficam em falta) numa tarefa, com avisos por linha.
 */
export const handlersImportacoes = [
  http.post(
    `${API}/importacoes/estudantes`,
    protegido('matriculas:escrever', async ({ request }) => {
      const { anoLectivoId, linhas } = (await request.json()) as S['ImportarEstudantesDto']
      const quem = utilizadorDo(request)!
      return idempotente(request, () => {
        const ano = anosLectivos.find((a) => a.id === anoLectivoId)
        if (!ano) return problema(422, 'Ano lectivo desconhecido')
        if (anoEncerrado(anoLectivoId))
          return problema(409, 'Ano encerrado', { code: 'ANO_ENCERRADO' })
        if (!linhas?.length) {
          return problema(422, 'Dados inválidos', {
            errors: [{ campo: 'linhas', mensagem: 'Não há linhas para importar.' }],
          })
        }
        const avisos: { linha: number; mensagem: string }[] = []
        const resultado = ['Linha;Processo;Nome;Classe;Estado']
        let n = 0
        for (const l of linhas) {
          const nome = l.nome.trim()
          const duplicado = db.estudantes.find(
            (e) => normalizar(e.nome) === normalizar(nome) && e.dataNascimento === l.dataNascimento,
          )
          if (duplicado) {
            const processo = duplicado.numeroProcesso
            avisos.push({
              linha: l.linha,
              mensagem: `${nome} já existe (processo n.º ${processo}); não foi importado.`,
            })
            resultado.push(`${l.linha};${processo};${nome};;Já existia`)
            continue
          }
          if (!classes.some((c) => c.id === l.classeId && c.estado === 'ACTIVA')) {
            avisos.push({ linha: l.linha, mensagem: `${nome}: a classe já não está activa.` })
            continue
          }
          const id = novoId('e')
          const numeroProcesso = `${ano.designacao.slice(0, 4)}/${String(db.sequencia).padStart(5, '0')}`
          const estudante = {
            id,
            numeroProcesso,
            nome,
            dataNascimento: l.dataNascimento,
            fotografiaUrl: null,
            estado: 'ACTIVO' as const,
            sexo: l.sexo,
            documentoIdentificacao: l.documentoIdentificacao,
            telefone: null,
            morada: null,
            naturalidade: null,
            versao: 1,
            encarregadoIds: [] as string[],
          }
          db.estudantes.push(estudante)
          for (const d of TIPOS_DOCUMENTO) {
            db.documentos.push({
              id: `${id}-${d.tipo}`,
              estudanteId: id,
              tipo: d.tipo,
              designacao: d.designacao,
              obrigatorio: d.obrigatorio,
              estado: d.obrigatorio ? 'EM_FALTA' : 'DISPENSADO',
            })
          }
          const existente = db.encarregados.find((x) => x.telefone === l.encarregado.telefone)
          if (existente) {
            existente.educandos.push(id)
            estudante.encarregadoIds.push(existente.id)
            const enc = existente.nome
            avisos.push({
              linha: l.linha,
              mensagem: `${nome}: o telefone já é de ${enc}; ficou associado a esse encarregado.`,
            })
          } else {
            const encId = novoId('enc')
            db.encarregados.push({
              id: encId,
              nome: l.encarregado.nome,
              parentesco: l.encarregado.parentesco.trim() || 'Encarregado',
              telefone: l.encarregado.telefone,
              email: null,
              educandos: [id],
            })
            estudante.encarregadoIds.push(encId)
          }
          const criadaEm = new Date().toISOString()
          db.matriculas.push({
            id: novoId('m'),
            estudanteId: id,
            anoLectivoId,
            classeId: l.classeId,
            turmaId: null,
            estado: 'PENDENTE',
            criadaEm,
            resultado: null,
          })
          const classe = classePorId(l.classeId).designacao
          db.percurso.push({
            id: novoId('p'),
            estudanteId: id,
            data: criadaEm,
            anoLectivo: ano.designacao,
            tipo: 'MATRICULA',
            descricao: `Matriculado na ${classe} (importação)`,
            autor: quem.nome,
            rectificaId: null,
            motivo: null,
          })
          resultado.push(`${l.linha};${numeroProcesso};${nome};${classe};Importado`)
          n++
        }
        const tarefa: Tarefa = {
          id: novoId('t'),
          tipo: 'IMPORTACAO',
          parametros: { anoLectivoId },
          titulo: `Importação de estudantes: ${n} ${n === 1 ? 'importado' : 'importados'}`,
          utilizadorId: quem.id,
          inicio: Date.now(),
          duracao: import.meta.env.MODE === 'test' ? 0 : 4000,
          falha: false,
          linhas: resultado,
          avisos,
        }
        db.tarefas.push(tarefa)
        auditar(
          quem.nome,
          'CRIAR',
          'Estudantes',
          `Importação: ${n} estudantes de ${linhas.length} linhas`,
        )
        return HttpResponse.json(paraTarefaDto(tarefa), { status: 202 })
      })
    }),
  ),
]
