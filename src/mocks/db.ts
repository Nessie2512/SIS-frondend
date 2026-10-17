import type { components } from '@/shared/api'
import {
  criarAcademico,
  type Atribuicao,
  type Disciplina,
  type Plano,
  type Professor,
} from './academico'
import { criarCalendario, type Evento, type Trimestre } from './calendario'
import { APELIDOS, gerador, NOMES_F, NOMES_M } from './nomes'

/**
 * Base de dados em memória do MSW (só desenvolvimento e testes).
 * Gera dados deterministas e aplica as regras de domínio que o servidor garante (guia 2.4),
 * para os ecrãs se comportarem como com o backend real. Manter coerente com schema.d.ts.
 */
type S = components['schemas']

export const UTILIZADORES: (S['MeDto'] & { palavraPasse: string })[] = [
  {
    id: 'u1',
    nome: 'Maria Secretária',
    email: 'secretaria@escola.ao',
    palavraPasse: 'secretaria',
    permissoes: [
      'estudantes:ler',
      'estudantes:escrever',
      'matriculas:ler',
      'matriculas:escrever',
      'turmas:ler',
      'turmas:escrever',
      'inscricoes:excepcao',
      'documentos:emitir',
      'professores:ler',
      'professores:escrever',
      'curriculo:ler',
      'curriculo:escrever',
      'calendario:ler',
      'calendario:escrever',
      'administracao:ler',
      'administracao:escrever',
      'anos:gerir',
    ],
  },
  {
    id: 'u2',
    nome: 'João Consulta',
    email: 'consulta@escola.ao',
    palavraPasse: 'consulta',
    permissoes: [
      'estudantes:ler',
      'matriculas:ler',
      'turmas:ler',
      'professores:ler',
      'curriculo:ler',
      'calendario:ler',
    ],
  },
]

const ANOS_INICIAIS: S['AnoLectivoDto'][] = [
  {
    id: 'ano-2025',
    designacao: '2025/2026',
    dataInicio: '2025-09-01',
    dataFim: '2026-07-31',
    estado: 'ENCERRADO',
  },
  {
    id: 'ano-2026',
    designacao: '2026/2027',
    dataInicio: '2026-09-01',
    dataFim: '2027-07-31',
    estado: 'EM_CURSO',
  },
]

/** Anos lectivos (mutável: abrir, activar, encerrar e reabrir mudam esta lista). */
export const anosLectivos: S['AnoLectivoDto'][] = ANOS_INICIAIS.map((a) => ({ ...a }))

export const classes: S['ClasseDto'][] = [
  { id: 'c7', designacao: '7.ª classe', cicloDesignacao: 'I ciclo do ensino secundário', ordem: 7 },
  { id: 'c8', designacao: '8.ª classe', cicloDesignacao: 'I ciclo do ensino secundário', ordem: 8 },
  { id: 'c9', designacao: '9.ª classe', cicloDesignacao: 'I ciclo do ensino secundário', ordem: 9 },
  {
    id: 'c10',
    designacao: '10.ª classe',
    cicloDesignacao: 'II ciclo do ensino secundário',
    ordem: 10,
  },
]

const TIPOS_DOCUMENTO = [
  { tipo: 'certidao-nascimento', designacao: 'Certidão de nascimento', obrigatorio: true },
  { tipo: 'bi', designacao: 'Bilhete de identidade', obrigatorio: true },
  { tipo: 'fotografias', designacao: 'Duas fotografias tipo passe', obrigatorio: true },
  { tipo: 'atestado-medico', designacao: 'Atestado médico', obrigatorio: true },
  { tipo: 'declaracao-anterior', designacao: 'Declaração da escola anterior', obrigatorio: false },
] as const
export const TIPOS_DOCUMENTO_OBRIGATORIOS = TIPOS_DOCUMENTO.filter((d) => d.obrigatorio).map(
  (d) => d.tipo,
)

const TURNOS: S['Turno'][] = ['MANHA', 'TARDE', 'NOITE']

interface Turma extends Omit<S['TurmaDto'], 'inscritos'> {
  anoLectivoId: string
}
interface Estudante extends Omit<S['EstudanteDto'], 'matriculaActual' | 'documentosEmFalta'> {
  versao: number
  encarregadoIds: string[]
}
interface Matricula {
  id: string
  estudanteId: string
  anoLectivoId: string
  classeId: string
  turmaId: string | null
  estado: S['EstadoMatricula']
  criadaEm: string
  /** Resultado final do ano (guia 2.3: registado antes de encerrar) */
  resultado: S['ResultadoFinal'] | null
}
interface Encarregado extends Omit<S['EncarregadoDto'], 'principal' | 'outrosEducandos'> {
  educandos: string[]
}
type Documento = S['DocumentoEstudanteDto'] & {
  estudanteId: string
}
export interface Tarefa {
  id: string
  tipo: S['TipoRelatorio'] | 'RENOVACAO' | 'DISTRIBUICAO'
  parametros: { anoLectivoId: string; turmaId?: string; classeId?: string }
  titulo: string
  utilizadorId: string | null
  inicio: number
  duracao: number
  falha: boolean
  /** Resultado já calculado (renovação): linhas do CSV e avisos por linha */
  linhas?: string[]
  avisos?: { linha: number; mensagem: string }[]
}

interface Estado {
  turmas: Turma[]
  estudantes: Estudante[]
  matriculas: Matricula[]
  encarregados: Encarregado[]
  documentos: Documento[]
  percurso: (S['EventoPercursoDto'] & { estudanteId: string })[]
  tarefas: Tarefa[]
  vistas: (S['VistaDto'] & { utilizadorId: string })[]
  ocorrencias: (S['OcorrenciaDto'] & { estudanteId: string })[]
  disciplinas: Disciplina[]
  planos: Plano[]
  professores: Professor[]
  atribuicoes: Atribuicao[]
  trimestres: Trimestre[]
  eventos: Evento[]
  /** Renovações de matrículas (simuladas e aplicadas) para o ano seguinte */
  renovacoes: Renovacao[]
  documentosOficiais: DocumentoOficial[]
  idempotencia: Map<string, unknown>
  sequencia: number
}

/** Documento oficial emitido (número, código e conteúdo gerados no servidor). */
export interface DocumentoOficial {
  id: string
  estudanteId: string
  tipo: S['TipoDocumentoOficial']
  numero: string
  codigo: string
  emitidoEm: string
  emitidoPor: string
  finalidade: string | null
  estado: 'VALIDO' | 'ANULADO'
  motivoAnulacao: string | null
  conteudo: S['ConteudoDocumentoDto']
}

export interface Renovacao {
  id: string
  anoOrigemId: string
  anoDestinoId: string
  aplicada: boolean
  /** Matrículas que a simulação incluía (para avisar de quem entretanto deixou de poder) */
  incluidos: string[]
}

function criar(): Estado {
  const aleatorio = gerador(2026)
  const escolher = <T>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)]!

  const turmas: Turma[] = anosLectivos.flatMap((ano) =>
    classes.flatMap((classe, c) =>
      ['A', 'B', 'C'].map((letra, l) => ({
        id: `${ano.id}-${classe.id}-${letra}`,
        anoLectivoId: ano.id,
        designacao: `${classe.designacao.replace(' classe', '')} ${letra}`,
        classeId: classe.id,
        classeDesignacao: classe.designacao,
        turno: TURNOS[l % TURNOS.length]!,
        sala: `Sala ${c * 3 + l + 1}`,
        lotacaoMaxima: 40,
        estado: ano.estado === 'ENCERRADO' ? 'ENCERRADA' : 'ACTIVA',
      })),
    ),
  )

  const estudantes: Estudante[] = []
  const matriculas: Matricula[] = []
  const documentos: Documento[] = []
  const encarregados: Encarregado[] = []
  const percurso: Estado['percurso'] = []

  // Lotação diferente por turma, com algumas cheias, para exercitar as regras
  const alvoPorTurma = (indice: number) =>
    [38, 40, 25, 31, 12, 40, 35, 22, 28, 39, 18, 33][indice % 12]!

  let n = 0
  const turmasActuais = turmas.filter((t) => t.anoLectivoId === 'ano-2026')
  turmasActuais.forEach((turma, indiceTurma) => {
    const alvo = alvoPorTurma(indiceTurma)
    // mais 3 estudantes por classe ficam sem turma (para o quadro)
    const extra = turma.designacao.endsWith('A') ? 3 : 0
    for (let i = 0; i < alvo + extra; i++) {
      n++
      const feminino = aleatorio() < 0.5
      const apelido = escolher(APELIDOS)
      const nome = `${escolher(feminino ? NOMES_F : NOMES_M)} ${escolher(APELIDOS)} ${apelido}`
      const ordem = classes.find((c) => c.id === turma.classeId)!.ordem
      const anoNascimento = 2026 - ordem - 6
      const id = `e${String(n).padStart(4, '0')}`
      const anoEntrada = 2026 - Math.floor(aleatorio() * Math.min(4, ordem - 6))
      estudantes.push({
        id,
        numeroProcesso: `${anoEntrada}/${String(n).padStart(5, '0')}`,
        nome,
        dataNascimento: `${anoNascimento}-${String(1 + Math.floor(aleatorio() * 12)).padStart(2, '0')}-${String(1 + Math.floor(aleatorio() * 28)).padStart(2, '0')}`,
        fotografiaUrl: null,
        estado: 'ACTIVO',
        sexo: feminino ? 'F' : 'M',
        documentoIdentificacao:
          aleatorio() < 0.7
            ? `00${Math.floor(aleatorio() * 1e7)}LA0${Math.floor(aleatorio() * 90 + 10)}`
            : null,
        telefone:
          aleatorio() < 0.8
            ? `9${Math.floor(aleatorio() * 1e8)
                .toString()
                .padStart(8, '0')}`
            : null,
        morada:
          aleatorio() < 0.8
            ? `Bairro ${escolher(['Maculusso', 'Ingombota', 'Cazenga', 'Viana', 'Talatona', 'Rangel'])}, Luanda`
            : null,
        naturalidade: escolher(['Luanda', 'Benguela', 'Huambo', 'Malanje', 'Uíge', 'Lubango']),
        versao: 1,
        encarregadoIds: [],
      })
      const semTurma = i >= alvo
      const pendente = aleatorio() < 0.08 || semTurma
      matriculas.push({
        id: `m${String(n).padStart(4, '0')}`,
        estudanteId: id,
        anoLectivoId: 'ano-2026',
        classeId: turma.classeId,
        turmaId: semTurma ? null : turma.id,
        estado: pendente ? 'PENDENTE' : 'CONFIRMADA',
        criadaEm: '2026-08-20T09:30:00Z',
        resultado: null,
      })
      for (const d of TIPOS_DOCUMENTO) {
        const emFalta = pendente && d.obrigatorio && aleatorio() < 0.5
        documentos.push({
          id: `${id}-${d.tipo}`,
          estudanteId: id,
          tipo: d.tipo,
          designacao: d.designacao,
          obrigatorio: d.obrigatorio,
          estado: emFalta
            ? 'EM_FALTA'
            : d.obrigatorio
              ? 'ENTREGUE'
              : aleatorio() < 0.5
                ? 'ENTREGUE'
                : 'DISPENSADO',
        })
      }
      // Irmãos partilham encarregado (o estudante anterior com o mesmo apelido, às vezes)
      const irmao = estudantes
        .slice(-12, -1)
        .find((e) => e.nome.endsWith(apelido) && aleatorio() < 0.4)
      if (irmao?.encarregadoIds[0]) {
        const partilhado = encarregados.find((x) => x.id === irmao.encarregadoIds[0])!
        partilhado.educandos.push(id)
        estudantes.at(-1)!.encarregadoIds.push(partilhado.id)
      } else {
        const enc: Encarregado = {
          id: `enc${n}`,
          nome: `${escolher(aleatorio() < 0.5 ? NOMES_F : NOMES_M)} ${apelido}`,
          parentesco: escolher(['Mãe', 'Pai', 'Tia', 'Avó', 'Tio']),
          telefone: `92${Math.floor(aleatorio() * 1e7)
            .toString()
            .padStart(7, '0')}`,
          email: aleatorio() < 0.3 ? `${apelido.toLowerCase()}${n}@mail.ao` : null,
          educandos: [id],
        }
        encarregados.push(enc)
        estudantes.at(-1)!.encarregadoIds.push(enc.id)
      }
      percurso.push(
        {
          id: `p${n}-1`,
          estudanteId: id,
          data: '2026-08-20T09:30:00Z',
          anoLectivo: '2026/2027',
          tipo: 'MATRICULA',
          descricao: `Matriculado na ${turma.classeDesignacao}`,
          autor: 'Maria Secretária',
          rectificaId: null,
          motivo: null,
        },
        ...(semTurma
          ? []
          : [
              {
                id: `p${n}-2`,
                estudanteId: id,
                data: '2026-08-28T11:00:00Z',
                anoLectivo: '2026/2027',
                tipo: 'INSCRICAO' as const,
                descricao: `Inscrito na turma ${turma.designacao}`,
                autor: 'Maria Secretária',
                rectificaId: null,
                motivo: null,
              },
            ]),
      )
    }
  })

  // Dos 3 sem turma de cada classe, 2 já têm a matrícula confirmada (documentos entregues):
  // podem ser inscritos; o terceiro fica por confirmar e o quadro não o deixa inscrever (guia 2.1).
  // Ajuste feito depois de gerar, para não mudar a sequência aleatória dos restantes dados.
  for (const classe of classes) {
    const semTurma = matriculas.filter((m) => m.classeId === classe.id && !m.turmaId)
    for (const m of semTurma.slice(0, 2)) {
      m.estado = 'CONFIRMADA'
      for (const d of documentos) {
        if (d.estudanteId === m.estudanteId && d.obrigatorio) d.estado = 'ENTREGUE'
      }
    }
  }

  return {
    turmas,
    estudantes,
    matriculas,
    encarregados,
    documentos,
    percurso,
    tarefas: [],
    // Exemplo do guia 7.1, para a secretária ver logo como funcionam
    vistas: [
      {
        id: 'v1',
        utilizadorId: 'u1',
        ecra: 'matriculas',
        nome: '7.ª classe sem turma',
        filtros: { classeId: 'c7', semTurma: true },
      },
    ],
    // Algumas ocorrências de exemplo, para a ficha não aparecer sempre vazia
    ocorrencias: estudantes
      .filter((_, i) => i % 23 === 4)
      .flatMap((e, i) => [
        {
          id: `oc${i * 2 + 1}`,
          estudanteId: e.id,
          data: '2026-09-22',
          tipo: 'PEDAGOGICA' as const,
          descricao:
            'Faltou à prova de diagnóstico de Matemática; marcada nova data com o professor.',
          autor: 'Maria Secretária',
          registadaEm: '2026-09-22T10:15:00Z',
        },
        ...(i % 2
          ? [
              {
                id: `oc${i * 2 + 2}`,
                estudanteId: e.id,
                data: '2026-10-05',
                tipo: 'SAUDE' as const,
                descricao:
                  'Sentiu-se mal durante a aula de Educação Física; o encarregado foi avisado.',
                autor: 'Maria Secretária',
                registadaEm: '2026-10-05T11:40:00Z',
              },
            ]
          : []),
      ]),
    ...criarAcademico(classes, turmas, anosLectivos),
    ...criarCalendario(anosLectivos),
    renovacoes: [],
    documentosOficiais: [],
    idempotencia: new Map(),
    sequencia: n,
  }
}

export let db = criar()

/** Volta ao estado inicial (usado entre testes). */
export function reporBaseDeDados() {
  anosLectivos.splice(0, anosLectivos.length, ...ANOS_INICIAIS.map((a) => ({ ...a })))
  db = criar()
}

// ---------------------------------------------------------------------------
// Projecções para DTO
// ---------------------------------------------------------------------------
const classePorId = (id: string) => classes.find((c) => c.id === id)!
const turmaPorId = (id: string | null) => (id ? db.turmas.find((t) => t.id === id) : undefined)

export const contarInscritos = (turmaId: string) =>
  db.matriculas.filter((m) => m.turmaId === turmaId && m.estado !== 'ANULADA').length

export function paraTurmaDto({ anoLectivoId: _, ...t }: Turma): S['TurmaDto'] {
  return { ...t, inscritos: contarInscritos(t.id) }
}

const documentosEmFalta = (estudanteId: string) =>
  db.documentos.filter(
    (d) => d.estudanteId === estudanteId && d.obrigatorio && d.estado === 'EM_FALTA',
  ).length

export function matriculaDe(estudanteId: string, anoLectivoId: string) {
  return db.matriculas.find(
    (m) =>
      m.estudanteId === estudanteId && m.anoLectivoId === anoLectivoId && m.estado !== 'ANULADA',
  )
}

export function paraEstudanteResumo(
  e: Estudante,
  anoLectivoId = 'ano-2026',
): S['EstudanteResumoDto'] {
  const m = matriculaDe(e.id, anoLectivoId)
  return {
    id: e.id,
    numeroProcesso: e.numeroProcesso,
    nome: e.nome,
    dataNascimento: e.dataNascimento,
    fotografiaUrl: e.fotografiaUrl,
    estado: e.estado,
    matriculaActual: m
      ? {
          id: m.id,
          classeDesignacao: classePorId(m.classeId).designacao,
          turmaId: m.turmaId,
          turmaDesignacao: turmaPorId(m.turmaId)?.designacao ?? null,
          estado: m.estado,
        }
      : null,
    documentosEmFalta: documentosEmFalta(e.id),
  }
}

export function paraEstudanteDto(e: Estudante): S['EstudanteDto'] {
  return {
    ...paraEstudanteResumo(e),
    sexo: e.sexo,
    documentoIdentificacao: e.documentoIdentificacao,
    telefone: e.telefone,
    morada: e.morada,
    naturalidade: e.naturalidade,
  }
}

export function paraMatriculaDto(m: Matricula): S['MatriculaDto'] {
  const e = db.estudantes.find((x) => x.id === m.estudanteId)!
  return {
    id: m.id,
    estudanteId: e.id,
    estudanteNome: e.nome,
    numeroProcesso: e.numeroProcesso,
    anoLectivoId: m.anoLectivoId,
    classeId: m.classeId,
    classeDesignacao: classePorId(m.classeId).designacao,
    turmaId: m.turmaId,
    turmaDesignacao: turmaPorId(m.turmaId)?.designacao ?? null,
    estado: m.estado,
    documentosEmFalta: documentosEmFalta(e.id),
    criadaEm: m.criadaEm,
  }
}

export function paraInscritoDto(m: Matricula): S['InscritoDto'] {
  const e = db.estudantes.find((x) => x.id === m.estudanteId)!
  return {
    matriculaId: m.id,
    estudanteId: e.id,
    turmaId: m.turmaId!,
    nome: e.nome,
    numeroProcesso: e.numeroProcesso,
    fotografiaUrl: e.fotografiaUrl,
  }
}

export function paraEncarregadoDto(
  enc: Encarregado,
  estudanteId: string,
  principal: boolean,
): S['EncarregadoDto'] {
  return {
    id: enc.id,
    nome: enc.nome,
    parentesco: enc.parentesco,
    telefone: enc.telefone,
    email: enc.email,
    principal,
    outrosEducandos: enc.educandos.filter((x) => x !== estudanteId).length,
  }
}

export function paraTarefaDto(t: Tarefa): S['TarefaDto'] {
  const decorrido = Date.now() - t.inicio
  const progresso = t.duracao <= 0 ? 100 : Math.min(100, Math.round((decorrido / t.duracao) * 100))
  const terminou = progresso >= 100
  return {
    id: t.id,
    titulo: t.titulo,
    estado: terminou ? (t.falha ? 'FALHADA' : 'CONCLUIDA') : 'EM_CURSO',
    progresso: t.falha && terminou ? 70 : progresso,
    resultadoUrl: terminou && !t.falha ? `/api/v1/tarefas/${t.id}/resultado` : null,
    erros: !terminou
      ? []
      : t.falha
        ? [{ linha: 12, mensagem: 'Estudante sem número de processo.' }]
        : (t.avisos ?? []),
  }
}

export const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export function novoId(prefixo: string) {
  db.sequencia++
  return `${prefixo}${String(db.sequencia).padStart(4, '0')}`
}

export { TIPOS_DOCUMENTO, classePorId, turmaPorId }
export type { Estudante, Matricula, Turma }
