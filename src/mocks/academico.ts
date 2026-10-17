import type { components } from '@/shared/api'
import { APELIDOS, gerador, NOMES_F, NOMES_M } from './nomes'

/**
 * Dados académicos simulados: disciplinas, planos curriculares com versões, professores e
 * atribuições por turma e disciplina. Deterministas; usados pela base de dados do MSW.
 */
type S = components['schemas']

export interface Disciplina {
  id: string
  nome: string
  sigla: string
  estado: S['EstadoDisciplina']
}

export interface LinhaPlano {
  disciplinaId: string
  horasSemanais: number
}

export interface Plano {
  id: string
  classeId: string
  versao: number
  estado: 'RASCUNHO' | 'VIGENTE' | 'ARQUIVADO'
  publicadoEm: string | null
  linhas: LinhaPlano[]
  /** Controlo de versão para edição concorrente (ETag) */
  revisao: number
}

export interface Professor {
  id: string
  numeroAgente: string
  nome: string
  estado: S['EstadoProfessor']
  habilitadas: string[]
  cargaMaxima: number
  telefone: string | null
  email: string | null
  habilitacao: string
  dataAdmissao: string
  documentos: { tipo: string; estado: 'ENTREGUE' | 'EM_FALTA' }[]
}

export interface Atribuicao {
  id: string
  anoLectivoId: string
  turmaId: string
  disciplinaId: string
  professorId: string
  horasSemanais: number
  desde: string
  /** Fim da atribuição (substituição); nula enquanto está em vigor */
  ate: string | null
  motivo: string | null
}

/** Atribuição em vigor: as terminadas ficam no histórico da turma. */
export const emVigor = (a: Atribuicao) => a.ate === null

export const TIPOS_DOCUMENTO_PROFESSOR: Record<string, string> = {
  BI: 'Bilhete de identidade',
  CERT_HAB: 'Certificado de habilitações',
  REG_CRIMINAL: 'Registo criminal',
  ATESTADO: 'Atestado médico',
}

const DISCIPLINAS: Disciplina[] = [
  { id: 'd-lp', nome: 'Língua Portuguesa', sigla: 'LP', estado: 'ACTIVA' },
  { id: 'd-mat', nome: 'Matemática', sigla: 'MAT', estado: 'ACTIVA' },
  { id: 'd-ing', nome: 'Língua Inglesa', sigla: 'ING', estado: 'ACTIVA' },
  { id: 'd-fis', nome: 'Física', sigla: 'FIS', estado: 'ACTIVA' },
  { id: 'd-qui', nome: 'Química', sigla: 'QUI', estado: 'ACTIVA' },
  { id: 'd-bio', nome: 'Biologia', sigla: 'BIO', estado: 'ACTIVA' },
  { id: 'd-geo', nome: 'Geografia', sigla: 'GEO', estado: 'ACTIVA' },
  { id: 'd-his', nome: 'História', sigla: 'HIS', estado: 'ACTIVA' },
  { id: 'd-ef', nome: 'Educação Física', sigla: 'EF', estado: 'ACTIVA' },
  { id: 'd-emc', nome: 'Educação Moral e Cívica', sigla: 'EMC', estado: 'ACTIVA' },
  { id: 'd-evp', nome: 'Educação Visual e Plástica', sigla: 'EVP', estado: 'ACTIVA' },
  { id: 'd-emp', nome: 'Empreendedorismo', sigla: 'EMP', estado: 'ACTIVA' },
  { id: 'd-fil', nome: 'Filosofia', sigla: 'FIL', estado: 'ACTIVA' },
  { id: 'd-inf', nome: 'Informática', sigla: 'INF', estado: 'ACTIVA' },
  { id: 'd-el', nome: 'Educação Laboral', sigla: 'EL', estado: 'INACTIVA' },
]

const sigla = (s: string) => `d-${s.toLowerCase()}`

/** Carga horária semanal por ciclo (dados de exemplo, não oficiais). */
const PLANO_I_CICLO: [string, number][] = [
  ['LP', 5],
  ['MAT', 5],
  ['ING', 3],
  ['FIS', 2],
  ['QUI', 2],
  ['BIO', 2],
  ['GEO', 2],
  ['HIS', 2],
  ['EF', 2],
  ['EMC', 1],
  ['EVP', 2],
]
const PLANO_II_CICLO: [string, number][] = [
  ['LP', 4],
  ['MAT', 5],
  ['ING', 3],
  ['FIS', 3],
  ['QUI', 3],
  ['BIO', 3],
  ['GEO', 2],
  ['HIS', 2],
  ['EF', 2],
  ['EMP', 2],
  ['FIL', 2],
]

/** Habilitações dos professores (por sigla) e estados que não são ACTIVO. */
const HABILITACOES: string[][] = [
  ['LP'],
  ['LP', 'ING'],
  ['LP'],
  ['MAT', 'FIS'],
  ['MAT'],
  ['MAT', 'INF'],
  ['ING'],
  ['ING', 'LP'],
  ['FIS', 'QUI'],
  ['QUI', 'BIO'],
  ['BIO'],
  ['GEO', 'HIS'],
  ['HIS', 'GEO'],
  ['EF'],
  ['EF'],
  ['EMC', 'HIS'],
  ['EVP'],
  ['EMP', 'EMC'],
  ['FIL', 'EMC'],
  ['LP', 'HIS'],
  ['MAT'],
  ['FIS'],
  ['BIO', 'QUI'],
  ['GEO'],
  ['ING'],
  ['INF', 'MAT'],
]
const ESTADOS_ESPECIAIS: Record<number, S['EstadoProfessor']> = {
  2: 'LICENCA',
  10: 'SUSPENSO',
  23: 'DESLIGADO',
}

export function criarAcademico(
  classes: { id: string; ordem: number }[],
  turmas: { id: string; anoLectivoId: string; classeId: string }[],
  anos: { id: string; dataInicio: string }[],
) {
  const aleatorio = gerador(1975)
  const escolher = <T>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)]!

  const disciplinas = DISCIPLINAS.map((d) => ({ ...d }))

  const planos: Plano[] = classes.flatMap((classe) => {
    const base = classe.ordem >= 10 ? PLANO_II_CICLO : PLANO_I_CICLO
    const linhas = base.map(([s, horas]) => ({ disciplinaId: sigla(s), horasSemanais: horas }))
    const resultado: Plano[] = [
      {
        id: `p-${classe.id}-1`,
        classeId: classe.id,
        versao: 1,
        estado: 'ARQUIVADO',
        publicadoEm: '2022-08-15',
        // A versão antiga ainda tinha Educação Laboral
        linhas: [
          ...linhas.filter((l) => l.disciplinaId !== 'd-evp' && l.disciplinaId !== 'd-emp'),
          { disciplinaId: 'd-el', horasSemanais: 2 },
        ],
        revisao: 1,
      },
      {
        id: `p-${classe.id}-2`,
        classeId: classe.id,
        versao: 2,
        estado: 'VIGENTE',
        publicadoEm: '2024-08-20',
        linhas,
        revisao: 1,
      },
    ]
    // A 7.ª classe tem uma revisão em preparação, para mostrar o rascunho editável
    if (classe.id === 'c7') {
      resultado.push({
        id: `p-${classe.id}-3`,
        classeId: classe.id,
        versao: 3,
        estado: 'RASCUNHO',
        publicadoEm: null,
        linhas: [...linhas.map((l) => ({ ...l })), { disciplinaId: 'd-inf', horasSemanais: 1 }],
        revisao: 1,
      })
    }
    return resultado
  })

  const professores: Professor[] = HABILITACOES.map((siglas, i) => {
    const feminino = aleatorio() < 0.5
    const apelido = escolher(APELIDOS)
    const primeiro = escolher(feminino ? NOMES_F : NOMES_M)
    const nome = `${primeiro} ${escolher(APELIDOS)} ${apelido}`
    const disciplina = DISCIPLINAS.find((d) => d.sigla === siglas[0])!.nome
    return {
      id: `prof-${String(i + 1).padStart(2, '0')}`,
      numeroAgente: String(104_200 + i * 37),
      nome,
      estado: ESTADOS_ESPECIAIS[i] ?? 'ACTIVO',
      habilitadas: siglas.map(sigla),
      cargaMaxima: 24,
      telefone: aleatorio() < 0.85 ? `92${Math.floor(1_000_000 + aleatorio() * 8_999_999)}` : null,
      email: `${primeiro
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')}.${apelido
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')}@escola.ao`,
      habilitacao: `Licenciatura em Ensino de ${disciplina}`,
      dataAdmissao: `${2008 + (i % 15)}-0${1 + (i % 9)}-15`,
      documentos: Object.keys(TIPOS_DOCUMENTO_PROFESSOR).map((tipo) => ({
        tipo,
        estado: tipo === 'REG_CRIMINAL' && i % 4 === 1 ? 'EM_FALTA' : 'ENTREGUE',
      })),
    }
  })

  // Atribuições: cada disciplina do plano vigente de cada turma, ao professor habilitado
  // (e ACTIVO) com menos carga, sem passar a carga máxima
  const atribuicoes: Atribuicao[] = []
  const carga = new Map<string, number>()
  let n = 0
  for (const turma of turmas) {
    const plano = planos.find((p) => p.classeId === turma.classeId && p.estado === 'VIGENTE')
    const ano = anos.find((a) => a.id === turma.anoLectivoId)!
    for (const linha of plano?.linhas ?? []) {
      const chave = (id: string) => `${turma.anoLectivoId}:${id}`
      const candidato = professores
        .filter((p) => p.estado === 'ACTIVO' && p.habilitadas.includes(linha.disciplinaId))
        .filter((p) => (carga.get(chave(p.id)) ?? 0) + linha.horasSemanais <= p.cargaMaxima)
        .sort((a, b) => (carga.get(chave(a.id)) ?? 0) - (carga.get(chave(b.id)) ?? 0))[0]
      if (!candidato) continue
      carga.set(chave(candidato.id), (carga.get(chave(candidato.id)) ?? 0) + linha.horasSemanais)
      atribuicoes.push({
        id: `at-${++n}`,
        anoLectivoId: turma.anoLectivoId,
        turmaId: turma.id,
        disciplinaId: linha.disciplinaId,
        professorId: candidato.id,
        horasSemanais: linha.horasSemanais,
        desde: ano.dataInicio,
        ate: null,
        motivo: null,
      })
    }
  }

  return { disciplinas, planos, professores, atribuicoes }
}
