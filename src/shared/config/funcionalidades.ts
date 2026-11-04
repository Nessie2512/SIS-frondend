import { eSoApiReal } from './ligacao'

interface Regra {
  /** Basta uma (permissões da interface, ver papeis.ts). Sem lista: qualquer utilizador. */
  permissoes?: readonly string[]
  /** Ainda sem rota no backend SIS: com a API real, não aparece a ninguém. */
  semServidor?: boolean
}

/**
 * O que cada utilizador pode usar (guia 2.7: esconder o que nunca poderá fazer). Menu, rotas,
 * paleta, atalhos, início e botões perguntam aqui, para não divergirem.
 *
 * Quando o backend publicar uma área, basta tirar `semServidor` da regra.
 */
export const FUNCIONALIDADES = {
  // Áreas (menu lateral e rotas)
  inicio: {},
  estudantes: { permissoes: ['estudantes:ler'] },
  /**
   * Lista de matrículas: GET /enrollments só aceita ADMIN, SECRETARIO e CHEFE_SECRETARIA, os
   * mesmos que matriculam (o director geral lê estudantes, mas recebe 403 aqui)
   */
  matriculas: { permissoes: ['matriculas:escrever'] },
  /** Filtro «A confirmar»: ainda sem rota para confirmar (aprovar responde 503) */
  matriculasPendentes: { permissoes: ['matriculas:ler'], semServidor: true },
  /** Confirmar com os documentos e anular uma matrícula (o backend só aprova pagamentos) */
  confirmarMatriculas: { permissoes: ['matriculas:aprovar'], semServidor: true },
  /** No backend toda a matrícula tem turma; ordenar a lista é só pelo nome */
  matriculasSemTurma: { semServidor: true },
  ordenarMatriculas: { semServidor: true },
  matricular: { permissoes: ['matriculas:escrever'] },
  turmas: { permissoes: ['turmas:ler'] },
  distribuirTurmas: { permissoes: ['turmas:ler'] },
  professores: { permissoes: ['professores:ler'] },
  curriculo: { permissoes: ['curriculo:ler'] },
  calendario: { permissoes: ['calendario:ler'], semServidor: true },
  anosLectivos: { permissoes: ['anos:gerir', 'anos:activar'] },
  /** Consultar os emitidos; emitir pede ainda documentos:emitir */
  documentosOficiais: { permissoes: ['documentos:emitir', 'estudantes:ler'], semServidor: true },
  relatorios: { permissoes: ['relatorios:ler'] },
  definicoes: {},
  utilizadores: { permissoes: ['administracao:ler'] },
  perfis: { permissoes: ['administracao:ler'] },
  auditoria: { permissoes: ['auditoria:ler'], semServidor: true },

  // Estudantes e matrículas
  importarEstudantes: { permissoes: ['matriculas:escrever'], semServidor: true },
  renovarMatriculas: { permissoes: ['matriculas:escrever'], semServidor: true },
  percurso: { permissoes: ['estudantes:ler'], semServidor: true },
  documentosEstudante: { permissoes: ['estudantes:ler'], semServidor: true },
  encarregados: { permissoes: ['estudantes:ler'], semServidor: true },
  ocorrencias: { permissoes: ['estudantes:ler'], semServidor: true },
  transferir: { permissoes: ['estudantes:escrever'], semServidor: true },
  /** Desistência e reingresso; anular o processo existe no backend */
  desistencia: { permissoes: ['estudantes:escrever'], semServidor: true },
  anularProcesso: { permissoes: ['estudantes:escrever'] },
  imprimirFicha: { permissoes: ['estudantes:ler'] },

  // Turmas e professores
  editarTurma: { permissoes: ['turmas:escrever'] },
  resultadosFinais: { permissoes: ['turmas:ler'], semServidor: true },
  /** Imprimir a lista da turma no navegador */
  listaNominal: { permissoes: ['turmas:ler'] },
  /** Gerar a lista nominal em PDF, em segundo plano */
  listaNominalPdf: { permissoes: ['turmas:ler'], semServidor: true },
  distribuicaoAutomatica: { permissoes: ['turmas:escrever'], semServidor: true },
  documentosProfessor: { permissoes: ['professores:ler'], semServidor: true },

  // Transversais
  painel: { semServidor: true },
  vistasGuardadas: { semServidor: true },
} as const satisfies Record<string, Regra>

export type Funcionalidade = keyof typeof FUNCIONALIDADES

/** O backend já tem esta funcionalidade? (Nos testes e no modo simulado, tudo existe.) */
export function existeNoServidor(f: Funcionalidade): boolean {
  const regra: Regra = FUNCIONALIDADES[f]
  return !(regra.semServidor && eSoApiReal())
}

/** Existe e o utilizador tem pelo menos uma das permissões que pede. */
export function podeUsar(f: Funcionalidade, permissoes: ReadonlySet<string>): boolean {
  const regra: Regra = FUNCIONALIDADES[f]
  const lista = regra.permissoes ?? []
  return existeNoServidor(f) && (lista.length === 0 || lista.some((p) => permissoes.has(p)))
}
