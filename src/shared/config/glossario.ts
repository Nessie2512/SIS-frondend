import { msg } from '@lingui/core/macro'

/**
 * Glossário único (guia 7.4), igual ao do backend.
 * A interface usa o verbo certo em cada passo: matricular na classe, inscrever na turma.
 * Descritores de mensagem: traduzir com i18n._(GLOSSARIO.turma.singular) ou useLingui().
 */
export const GLOSSARIO = {
  estudante: { singular: msg`estudante`, plural: msg`estudantes` },
  matricula: { singular: msg`matrícula`, plural: msg`matrículas`, verbo: msg`Matricular` },
  inscricao: { singular: msg`inscrição`, plural: msg`inscrições`, verbo: msg`Inscrever na turma` },
  turma: { singular: msg`turma`, plural: msg`turmas` },
  classe: { singular: msg`classe`, plural: msg`classes` },
  ciclo: { singular: msg`ciclo`, plural: msg`ciclos` },
  anoLectivo: { singular: msg`ano lectivo`, plural: msg`anos lectivos` },
  encarregado: { singular: msg`encarregado`, plural: msg`encarregados` },
  professor: { singular: msg`professor`, plural: msg`professores` },
} as const
