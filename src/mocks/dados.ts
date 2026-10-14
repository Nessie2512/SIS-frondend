import type { components } from '@/shared/api'

type S = components['schemas']

/** Dados de exemplo enquanto não há backend. Manter coerentes com o contrato provisório em schema.d.ts. */
export const anosLectivos: S['AnoLectivoDto'][] = [
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

const classes = [
  { id: 'c7', designacao: '7.ª classe' },
  { id: 'c8', designacao: '8.ª classe' },
  { id: 'c9', designacao: '9.ª classe' },
  { id: 'c10', designacao: '10.ª classe' },
]
const turnos: S['Turno'][] = ['MANHA', 'TARDE', 'NOITE']

export const turmas: (S['TurmaDto'] & { anoLectivoId: string })[] = anosLectivos.flatMap((ano, a) =>
  classes.flatMap((classe, c) =>
    ['A', 'B', 'C'].map((letra, l) => ({
      id: `${ano.id}-${classe.id}-${letra}`,
      anoLectivoId: ano.id,
      designacao: `${classe.designacao.replace(' classe', '')} ${letra}`,
      classeId: classe.id,
      classeDesignacao: classe.designacao,
      turno: turnos[l % turnos.length]!,
      sala: `Sala ${c * 3 + l + 1}`,
      lotacaoMaxima: 40,
      inscritos: (c * 7 + l * 13 + a * 5) % 41,
      estado: ano.estado === 'ENCERRADO' ? 'ENCERRADA' : 'ACTIVA',
    })),
  ),
)

export const utilizador: S['MeDto'] = {
  id: 'u1',
  nome: 'Secretário de Teste',
  email: 'secretaria@escola.ao',
  permissoes: ['turmas:ler', 'turmas:escrever', 'matriculas:ler', 'matriculas:escrever'],
}
