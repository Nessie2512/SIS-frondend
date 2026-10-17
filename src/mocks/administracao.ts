import { http, HttpResponse } from 'msw'
import type { components } from '@/shared/api'
import { API, problema, protegido, utilizadorDo } from './apoio'
import { APELIDOS, gerador, NOMES_F, NOMES_M } from './nomes'

/**
 * Administração simulada: perfis de acesso, utilizadores e registo de auditoria.
 * O estado vive aqui (e é reposto com a base de dados) para não criar dependências circulares.
 */
type S = components['schemas']

const LEITURA = [
  'estudantes:ler',
  'matriculas:ler',
  'turmas:ler',
  'professores:ler',
  'curriculo:ler',
  'calendario:ler',
]
const ESCRITA = [
  'estudantes:escrever',
  'matriculas:escrever',
  'turmas:escrever',
  'inscricoes:excepcao',
  'professores:escrever',
  'curriculo:escrever',
  'calendario:escrever',
]

export const PERFIS: Omit<S['PerfilDto'], 'utilizadores'>[] = [
  {
    id: 'perfil-admin',
    nome: 'Administração',
    descricao: 'Tudo o que a secretaria faz, mais utilizadores, perfis e auditoria.',
    permissoes: [
      ...LEITURA,
      ...ESCRITA,
      'documentos:emitir',
      'administracao:ler',
      'administracao:escrever',
      'anos:gerir',
    ],
  },
  {
    id: 'perfil-secretaria',
    nome: 'Secretaria',
    descricao: 'Matrículas, turmas, professores, currículo e calendário.',
    permissoes: [...LEITURA, ...ESCRITA, 'documentos:emitir', 'anos:gerir'],
  },
  {
    id: 'perfil-direccao',
    nome: 'Direcção',
    descricao: 'Consulta de tudo e emissão de documentos oficiais.',
    permissoes: [...LEITURA, 'documentos:emitir'],
  },
  {
    id: 'perfil-consulta',
    nome: 'Consulta',
    descricao: 'Só leitura.',
    permissoes: LEITURA,
  },
]

type Utilizador = Omit<S['UtilizadorDto'], 'perfil'>
type Entrada = S['EntradaAuditoriaDto']

interface EstadoAdministracao {
  utilizadores: Utilizador[]
  auditoria: Entrada[]
  sequencia: number
}

function criar(): EstadoAdministracao {
  const aleatorio = gerador(42)
  const escolher = <T>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)]!
  const sem = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')

  const utilizadores: Utilizador[] = [
    {
      id: 'u1',
      nome: 'Maria Secretária',
      email: 'secretaria@escola.ao',
      perfilId: 'perfil-admin',
      estado: 'ACTIVO',
      ultimoAcesso: '2026-10-16T08:05:00Z',
    },
    {
      id: 'u2',
      nome: 'João Consulta',
      email: 'consulta@escola.ao',
      perfilId: 'perfil-consulta',
      estado: 'ACTIVO',
      ultimoAcesso: '2026-10-14T15:20:00Z',
    },
  ]
  const perfis = ['perfil-secretaria', 'perfil-secretaria', 'perfil-direccao', 'perfil-consulta']
  for (let i = 3; i <= 12; i++) {
    const primeiro = escolher(aleatorio() < 0.5 ? NOMES_F : NOMES_M)
    const apelido = escolher(APELIDOS)
    utilizadores.push({
      id: `u${i}`,
      nome: `${primeiro} ${apelido}`,
      email: `${sem(primeiro)}.${sem(apelido)}@escola.ao`,
      perfilId: perfis[i % perfis.length]!,
      estado: i % 7 === 0 ? 'INACTIVO' : 'ACTIVO',
      ultimoAcesso:
        i % 7 === 0 ? null : `2026-10-${String(1 + (i % 15)).padStart(2, '0')}T0${i % 9}:30:00Z`,
    })
  }

  // Histórico de exemplo: as últimas semanas
  const accoes: [S['AccaoAuditoria'], string, string][] = [
    ['CRIAR', 'Matrícula', 'Matrícula na 7.ª classe'],
    ['CONFIRMAR', 'Matrícula', 'Documentos completos; matrícula confirmada'],
    ['ALTERAR', 'Inscrição', 'Mudou de 8.ª A para 8.ª B: pedido do encarregado'],
    ['ALTERAR', 'Estudante', 'Telefone alterado'],
    ['ENTRAR', 'Sessão', 'Entrada na aplicação'],
    ['PUBLICAR', 'Plano curricular', 'Versão 2 da 9.ª classe publicada'],
    ['ALTERAR', 'Professor', 'Estado: de licença'],
  ]
  const auditoria: Entrada[] = Array.from({ length: 64 }, (_, i) => {
    const [accao, recurso, detalhe] = escolher(accoes)
    const autor = escolher(utilizadores.filter((u) => u.perfilId !== 'perfil-consulta'))
    return {
      id: `aud${i + 1}`,
      quando: new Date(Date.UTC(2026, 9, 16) - (i * 7 + 3) * 3_600_000).toISOString(),
      utilizador: autor.nome,
      accao,
      recurso,
      detalhe,
    }
  })
  return { utilizadores, auditoria, sequencia: 0 }
}

export let administracao = criar()
export function reporAdministracao() {
  administracao = criar()
}

/** Regista uma entrada de auditoria (chamado pelos handlers das acções que mudam dados). */
export function auditar(
  utilizador: string,
  accao: S['AccaoAuditoria'],
  recurso: string,
  detalhe: string,
) {
  administracao.sequencia++
  administracao.auditoria.unshift({
    id: `aud-n${administracao.sequencia}`,
    quando: new Date().toISOString(),
    utilizador,
    accao,
    recurso,
    detalhe,
  })
}

const paraUtilizadorDto = (u: Utilizador): S['UtilizadorDto'] => ({
  ...u,
  perfil: PERFIS.find((p) => p.id === u.perfilId)!.nome,
})

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export const handlersAdministracao = (() => {
  const nomeDe = (request: Request) => utilizadorDo(request)?.nome ?? ''
  return [
    http.get(
      `${API}/perfis`,
      protegido('administracao:ler', () =>
        HttpResponse.json(
          PERFIS.map((p) => ({
            ...p,
            utilizadores: administracao.utilizadores.filter((u) => u.perfilId === p.id).length,
          })) satisfies S['PerfilDto'][],
        ),
      ),
    ),

    http.get(
      `${API}/utilizadores`,
      protegido('administracao:ler', ({ request }) => {
        const url = new URL(request.url)
        const pesquisa = normalizar(url.searchParams.get('pesquisa') ?? '')
        const perfilId = url.searchParams.get('perfilId')
        const estado = url.searchParams.get('estado')
        return HttpResponse.json(
          administracao.utilizadores
            .filter(
              (u) =>
                (!pesquisa ||
                  normalizar(u.nome).includes(pesquisa) ||
                  u.email.includes(pesquisa)) &&
                (!perfilId || u.perfilId === perfilId) &&
                (!estado || u.estado === estado),
            )
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
            .map(paraUtilizadorDto) satisfies S['UtilizadorDto'][],
        )
      }),
    ),

    http.post(
      `${API}/utilizadores/:id/estado`,
      protegido('administracao:escrever', async ({ request, params }) => {
        const alvo = administracao.utilizadores.find((u) => u.id === params.id)
        if (!alvo) return problema(404, 'Utilizador não encontrado')
        const { estado } = (await request.json()) as { estado: S['EstadoUtilizador'] }
        const quem = nomeDe(request)
        if (alvo.nome === quem && estado === 'INACTIVO') {
          return problema(409, 'Própria conta', { code: 'PROPRIA_CONTA' })
        }
        alvo.estado = estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'
        auditar(
          quem,
          'ALTERAR',
          'Utilizador',
          `${alvo.nome}: ${alvo.estado === 'ACTIVO' ? 'activado' : 'desactivado'}`,
        )
        return HttpResponse.json(paraUtilizadorDto(alvo))
      }),
    ),

    http.get(
      `${API}/auditoria`,
      protegido('administracao:ler', ({ request }) => {
        const url = new URL(request.url)
        const pesquisa = normalizar(url.searchParams.get('pesquisa') ?? '')
        const accao = url.searchParams.get('accao')
        const lista = administracao.auditoria.filter(
          (e) =>
            (!accao || e.accao === accao) &&
            (!pesquisa ||
              normalizar(`${e.utilizador} ${e.recurso} ${e.detalhe}`).includes(pesquisa)),
        )
        const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
        const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') ?? 50))
        return HttpResponse.json({
          items: lista.slice((page - 1) * pageSize, page * pageSize),
          total: lista.length,
          page,
          pageSize,
        } satisfies S['PaginaAuditoriaDto'])
      }),
    ),
  ]
})()
