import { msg } from '@lingui/core/macro'

/**
 * Identidade da escola nos documentos impressos (papel timbrado dos modelos da secretaria).
 * O backend ainda não tem configuração da escola: quando tiver, estes dados passam a vir de lá.
 */
/* eslint-disable lingui/no-unlocalized-strings -- nome próprio e morada não se traduzem */
export const ESCOLA = {
  nome: 'Bright Minds Academy',
  /** Ficheiro em public/ */
  logotipo: 'escola/logotipo.jpg',
  morada: [
    'Bairro Golf II, junto a Igreja Pentecostal',
    'Município de Belas, Kilamba Kiaxi, Luanda-Angola.',
  ],
  telefones: ['927690224', '947410603', '923933866'],
  /** Rodapé de todas as páginas impressas */
  rodape: 'SIS system powered by Serve.io | Bright Minds Academy',
  niveis: [msg`Creche`, msg`Jardim de infância`, msg`Ensino primário`, msg`I ciclo do secundário`],
} as const
/* eslint-enable lingui/no-unlocalized-strings */
