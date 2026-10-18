import { useLingui } from '@lingui/react/macro'
import type { ErroFicheiro, ErroLinha } from '../model/analisar'

/** Traduz os códigos da análise (que corre sem i18n, no Worker) para o texto do ecrã. */
export function useMensagensAnalise() {
  const { t } = useLingui()
  return {
    linha(e: ErroLinha): string {
      const valor = e.valor ?? ''
      switch (e.codigo) {
        case 'FALTA_NOME':
          return t`Falta o nome.`
        case 'NOME_INCOMPLETO':
          return t`Indique pelo menos nome e apelido.`
        case 'SEXO_INVALIDO':
          return t`Use M ou F.`
        case 'FALTA_DATA':
          return t`Falta a data de nascimento.`
        case 'DATA_INVALIDA':
          return t`Data inválida: use DD/MM/AAAA.`
        case 'IDADE_FORA':
          return t`A idade tem de estar entre 4 e 30 anos.`
        case 'BILHETE_INVALIDO':
          return t`Bilhete inválido (ex.: 004512345LA041).`
        case 'FALTA_CLASSE':
          return t`Falta a classe.`
        case 'CLASSE_DESCONHECIDA':
          return t`Classe desconhecida: «${valor}».`
        case 'FALTA_ENCARREGADO':
          return t`Falta o nome do encarregado.`
        case 'TELEFONE_INVALIDO':
          return t`Telefone inválido: 9 algarismos, a começar por 9.`
        case 'LINHA_REPETIDA':
          return t`Repete a linha ${valor} (mesmo nome e data de nascimento).`
      }
    },
    ficheiro(e: ErroFicheiro): string {
      switch (e.codigo) {
        case 'VAZIO':
          return t`O ficheiro está vazio.`
        case 'SO_CABECALHO':
          return t`O ficheiro só tem o cabeçalho.`
        case 'COLUNAS_EM_FALTA': {
          const colunas = e.colunas.join(', ')
          return t`Faltam colunas no cabeçalho: ${colunas}. Use o modelo.`
        }
      }
    },
  }
}
