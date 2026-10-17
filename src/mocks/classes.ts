import { http, HttpResponse } from 'msw'
import { auditar } from './administracao'
import { API, problema, protegido, utilizadorDo, type S } from './apoio'
import { ciclos, classes, db, novoId } from './db'

/**
 * Ciclos e classes (guia 2.1, 2.4, 2.5): árvore com sequência; uma classe em uso não se
 * elimina, inactiva-se (deixa de ser oferecida em matrículas e turmas novas; o histórico fica).
 */

function usoDe(classeId: string) {
  return {
    turmas: db.turmas.filter((t) => t.classeId === classeId).length,
    matriculas: db.matriculas.filter((m) => m.classeId === classeId).length,
    planos: db.planos.filter((p) => p.classeId === classeId).length,
  }
}

const normalizarDesignacao = (d: string) => d.trim().replace(/\s+/g, ' ')

export const handlersClasses = [
  http.get(
    `${API}/ciclos`,
    protegido('curriculo:ler', () =>
      HttpResponse.json(
        ciclos.map((c) => ({
          ...c,
          classes: classes
            .filter((x) => x.cicloId === c.id)
            .sort((a, b) => a.ordem - b.ordem)
            .map((x) => ({ ...x, ...usoDe(x.id) })),
        })) satisfies S['CicloDto'][],
      ),
    ),
  ),

  http.post(
    `${API}/ciclos`,
    protegido('curriculo:escrever', async ({ request }) => {
      const { designacao } = (await request.json()) as { designacao: string }
      const nome = normalizarDesignacao(designacao ?? '')
      if (nome.length < 3) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'designacao', mensagem: 'Escreva o nome do ciclo.' }],
        })
      }
      const ciclo = { id: novoId('ciclo'), designacao: nome, estado: 'ACTIVO' as const }
      ciclos.push(ciclo)
      auditar(utilizadorDo(request)!.nome, 'CRIAR', 'Ciclo', nome)
      return HttpResponse.json(ciclo, { status: 201 })
    }),
  ),

  http.post(
    `${API}/classes`,
    protegido('curriculo:escrever', async ({ request }) => {
      const { cicloId, designacao } = (await request.json()) as {
        cicloId: string
        designacao: string
      }
      const ciclo = ciclos.find((c) => c.id === cicloId)
      const nome = normalizarDesignacao(designacao ?? '')
      if (!ciclo) return problema(404, 'Ciclo não encontrado')
      if (nome.length < 3) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'designacao', mensagem: 'Escreva a designação da classe.' }],
        })
      }
      if (classes.some((c) => c.designacao.toLowerCase() === nome.toLowerCase())) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'designacao', mensagem: 'Já existe uma classe com esta designação.' }],
        })
      }
      // Entra a seguir à última classe do ciclo; as dos ciclos seguintes avançam uma posição
      const doCiclo = classes.filter((c) => c.cicloId === ciclo.id)
      const ordem = doCiclo.length
        ? Math.max(...doCiclo.map((c) => c.ordem)) + 1
        : Math.max(0, ...classes.map((c) => c.ordem)) + 1
      for (const c of classes) if (c.ordem >= ordem) c.ordem++
      const classe: S['ClasseDto'] = {
        id: novoId('c'),
        designacao: nome,
        cicloId: ciclo.id,
        cicloDesignacao: ciclo.designacao,
        ordem,
        estado: 'ACTIVA',
      }
      classes.push(classe)
      auditar(utilizadorDo(request)!.nome, 'CRIAR', 'Classe', `${nome} (${ciclo.designacao})`)
      return HttpResponse.json(classe, { status: 201 })
    }),
  ),

  http.patch(
    `${API}/classes/:id`,
    protegido('curriculo:escrever', async ({ request, params }) => {
      const classe = classes.find((c) => c.id === params.id)
      if (!classe) return problema(404, 'Classe não encontrada')
      const { designacao } = (await request.json()) as { designacao: string }
      const nome = normalizarDesignacao(designacao ?? '')
      if (nome.length < 3) {
        return problema(422, 'Dados inválidos', {
          errors: [{ campo: 'designacao', mensagem: 'Escreva a designação da classe.' }],
        })
      }
      classe.designacao = nome
      for (const t of db.turmas) if (t.classeId === classe.id) t.classeDesignacao = nome
      return HttpResponse.json(classe)
    }),
  ),

  http.delete(
    `${API}/classes/:id`,
    protegido('curriculo:escrever', ({ request, params }) => {
      const classe = classes.find((c) => c.id === params.id)
      if (!classe) return problema(404, 'Classe não encontrada')
      const uso = usoDe(classe.id)
      if (uso.turmas || uso.matriculas || uso.planos) {
        return problema(409, 'Classe em uso', { code: 'CLASSE_EM_USO', ...uso })
      }
      classes.splice(classes.indexOf(classe), 1)
      for (const c of classes) if (c.ordem > classe.ordem) c.ordem--
      auditar(utilizadorDo(request)!.nome, 'ALTERAR', 'Classe', `${classe.designacao}: eliminada`)
      return HttpResponse.json({})
    }),
  ),

  http.post(
    `${API}/classes/:id/estado`,
    protegido('curriculo:escrever', async ({ request, params }) => {
      const classe = classes.find((c) => c.id === params.id)
      if (!classe) return problema(404, 'Classe não encontrada')
      const { estado } = (await request.json()) as { estado: 'ACTIVA' | 'INACTIVA' }
      classe.estado = estado === 'INACTIVA' ? 'INACTIVA' : 'ACTIVA'
      auditar(
        utilizadorDo(request)!.nome,
        'ALTERAR',
        'Classe',
        `${classe.designacao}: ${classe.estado === 'ACTIVA' ? 'reactivada' : 'inactivada'}`,
      )
      return HttpResponse.json(classe)
    }),
  ),
]
