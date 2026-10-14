/**
 * Glossário único (guia 7.4), igual ao do backend.
 * A interface usa o verbo certo em cada passo: matricular na classe, inscrever na turma.
 */
export const GLOSSARIO = {
  estudante: { singular: 'estudante', plural: 'estudantes' },
  matricula: { singular: 'matrícula', plural: 'matrículas', verbo: 'Matricular' },
  inscricao: { singular: 'inscrição', plural: 'inscrições', verbo: 'Inscrever na turma' },
  turma: { singular: 'turma', plural: 'turmas' },
  classe: { singular: 'classe', plural: 'classes' },
  ciclo: { singular: 'ciclo', plural: 'ciclos' },
  anoLectivo: { singular: 'ano lectivo', plural: 'anos lectivos' },
  encarregado: { singular: 'encarregado', plural: 'encarregados' },
  professor: { singular: 'professor', plural: 'professores' },
} as const
