import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { eApiError, type CodigoErroDominio } from '@/shared/api'
import { notificar } from '@/shared/ui/notificacoes'

/**
 * Erros de domínio em linguagem simples (guia 2.6, 7.4): diz o efeito e o que fazer a seguir;
 * nunca mostra códigos técnicos. O comportamento específico (reverter o gesto, abrir a
 * matrícula existente, passar a modo de leitura) é decidido por quem chama, a partir do código.
 */
const POR_CODIGO: Record<CodigoErroDominio, MessageDescriptor> = {
  ANO_ENCERRADO: msg`Este ano lectivo está encerrado. Só é possível consultar.`,
  LOTACAO_ESGOTADA: msg`Esta turma já está cheia. Escolha outra turma ou peça uma excepção.`,
  MATRICULA_DUPLICADA: msg`Este estudante já tem matrícula neste ano lectivo. Abrimos a matrícula existente.`,
  ESTUDANTE_DUPLICADO: msg`Pode já existir um processo para este estudante. Confirme antes de continuar.`,
  DOCENTE_NAO_HABILITADO: msg`Este professor não está habilitado para esta disciplina.`,
  CLASSE_EM_USO: msg`Não é possível eliminar porque está em uso. Pode inactivar em vez disso.`,
  VERSAO_DESACTUALIZADA: msg`Outra pessoa alterou este registo entretanto. Mostramos a versão actual.`,
  PERMISSAO_NEGADA: msg`Não tem permissão para esta acção.`,
  INSCRICAO_EXISTENTE: msg`Este estudante já está numa turma. Use Mover para mudar de turma.`,
  DOCUMENTO_OBRIGATORIO: msg`Este documento é obrigatório e não pode ser dispensado.`,
  CREDENCIAIS_INVALIDAS: msg`O email ou a palavra-passe não estão correctos.`,
  VISTA_REPETIDA: msg`Já tem uma vista com este nome. Escolha outro.`,
  PLANO_NAO_EDITAVEL: msg`Só o rascunho se edita. Para mudar um plano vigente, crie uma nova versão.`,
  RASCUNHO_EXISTENTE: msg`Esta classe já tem um rascunho em preparação. Abrimos o rascunho existente.`,
  DISCIPLINA_REPETIDA: msg`Já existe uma disciplina com este nome ou sigla.`,
  DOCUMENTOS_EM_FALTA: msg`Faltam documentos obrigatórios. Marque-os como entregues antes de confirmar.`,
  PROPRIA_CONTA: msg`Não pode desactivar a sua própria conta.`,
  PENDENCIAS_POR_RESOLVER: msg`Ainda há pendências por resolver. Resolva-as antes de encerrar o ano.`,
  OUTRO_ANO_EM_CURSO: msg`Já há um ano lectivo em curso. Encerre-o primeiro.`,
  ANO_PLANEADO_EXISTENTE: msg`O próximo ano lectivo já foi criado. Continue a prepará-lo.`,
  TURMA_COM_INSCRITOS: msg`A turma ainda tem estudantes. Mova-os para outra turma antes de a encerrar.`,
  RENOVACAO_APLICADA: msg`A renovação para este ano já foi feita. As matrículas que faltem fazem-se uma a uma.`,
  EVENTO_FIXO: msg`Os feriados nacionais vêm da lei e não se apagam.`,
  DISCIPLINA_EM_USO: msg`Esta disciplina já foi usada num plano e não se elimina. Pode inactivá-la.`,
}

const SESSAO_EXPIRADA = msg`A sessão terminou. Entre de novo para continuar.`
const LIMITE_PEDIDOS = msg`Muitos pedidos seguidos. Aguarde um momento e tente de novo.`
const VALIDACAO = msg`Reveja os campos assinalados.`
const FALHA_GUARDAR = msg`Não foi possível guardar. A sua alteração continua aqui.`
const FALHA_GENERICA = msg`Algo correu mal do nosso lado. Tente de novo dentro de momentos.`

/** Mensagem humana para qualquer erro vindo da API (ou de rede). */
export function mensagemDeErro(erro: unknown): string {
  if (!eApiError(erro)) return i18n._(FALHA_GENERICA)
  const conhecido = erro.code ? POR_CODIGO[erro.code as CodigoErroDominio] : undefined
  if (conhecido) return i18n._(conhecido)
  if (erro.status === 401) return i18n._(SESSAO_EXPIRADA)
  if (erro.status === 429) return i18n._(LIMITE_PEDIDOS)
  if (erro.status === 400 || erro.status === 422) return i18n._(VALIDACAO)
  if (erro.eTransitorio) return i18n._(FALHA_GUARDAR)
  return i18n._(FALHA_GENERICA)
}

/** Mostra o erro numa notificação; oferece Tentar de novo quando a falha é transitória. */
export function notificarErroDeDominio(erro: unknown, tentarDeNovo?: () => void): string {
  const mensagem = mensagemDeErro(erro)
  const transitorio = eApiError(erro) && erro.eTransitorio
  notificar.erro(mensagem, transitorio ? tentarDeNovo : undefined)
  return mensagem
}
