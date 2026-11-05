import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { isBefore, subMonths } from 'date-fns'
import { z } from 'zod'

const m = (descritor: MessageDescriptor) => () => i18n._(descritor)

/** Telefone angolano: 9 dígitos a começar por 9. A máscara ajuda mas nunca impede escrever ou colar (guia 7.2). */
export const soDigitos = (valor: string) => valor.replace(/\D/g, '')
const telefone = z
  .string()
  .trim()
  .refine((v) => /^9\d{8}$/.test(soDigitos(v)), {
    error: m(msg`O telefone tem 9 dígitos e começa por 9.`),
  })
/**
 * Esquemas do assistente, derivados do NovaMatriculaDto (guia 4.3): a validação do cliente
 * acompanha a do servidor. Quando houver OpenAPI, confirmar campos e limites.
 */
export const esquemaDados = z.object({
  nome: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).length >= 2, { error: m(msg`Escreva o nome completo.`) }),
  dataNascimento: z
    .string()
    .min(1, { error: m(msg`Indique a data de nascimento.`) })
    .refine(
      (v) => {
        const data = new Date(`${v}T00:00:00`)
        return !Number.isNaN(data.getTime()) && isBefore(data, subMonths(new Date(), 18))
      },
      { error: m(msg`O estudante deve ter pelo menos 18 meses.`) },
    ),
  sexo: z.enum(['M', 'F'], { error: m(msg`Escolha o sexo.`) }),
  tipoDocumento: z.enum(['BI', 'PASSPORT', 'BIRTH_CERTIFICATE', 'N/A'], {
    error: m(msg`Escolha o tipo de documento.`),
  }),
  documentoIdentificacao: z.string().trim(),
  endereco: z.object({
    streetAndNumber: z
      .string()
      .trim()
      .min(1, { error: m(msg`Indique a rua e o número.`) }),
    neighborhood: z
      .string()
      .trim()
      .min(1, { error: m(msg`Indique o bairro ou quarteirão.`) }),
    municipality: z
      .string()
      .trim()
      .min(1, { error: m(msg`Indique o município.`) }),
    province: z
      .string()
      .trim()
      .min(1, { error: m(msg`Indique a província.`) }),
  }),
  nacionalidade: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique a nacionalidade.`) }),
  fatherName: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique o nome do pai.`) }),
  fatherContact: telefone,
  motherName: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique o nome da mãe.`) }),
  motherContact: telefone,
  bestLanguage: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique o idioma preferencial.`) }),
  familyPrefix: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique o prefixo familiar.`) }),
})

export const esquemaDuplicado = z.object({
  candidatos: z.number(),
  ignorado: z.boolean(),
  justificacao: z.string().trim(),
})

export const esquemaEncarregado = z.object({
  nome: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).length >= 2, { error: m(msg`Escreva o nome completo.`) }),
  parentesco: z
    .string()
    .trim()
    .min(1, { error: m(msg`Indique o parentesco.`) }),
  telefone,
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, {
      error: m(msg`Escreva um email válido.`),
    }),
  principal: z.boolean(),
})

export const esquemaMatricula = z
  .object({
    estudante: esquemaDados,
    duplicado: esquemaDuplicado,
    encarregados: z
      .array(esquemaEncarregado)
      .min(1, { error: m(msg`Indique pelo menos um encarregado.`) }),
    documentosEntregues: z.array(z.string()),
    classeId: z.string().min(1, { error: m(msg`Escolha a classe.`) }),
    turmaId: z.string().nullable(),
    /** Transferência de entrada (guia 2.3): escola de origem e classes lá concluídas */
    transferencia: z.object({
      activa: z.boolean(),
      escola: z.string().trim(),
      classesConcluidas: z.array(z.string()),
    }),
  })
  .superRefine((dados, ctx) => {
    if (dados.estudante.tipoDocumento !== 'N/A' && !dados.estudante.documentoIdentificacao) {
      ctx.addIssue({
        code: 'custom',
        path: ['estudante', 'documentoIdentificacao'],
        message: i18n._(msg`Indique o número do documento ou escolha “Sem documento”.`),
      })
    }
    if (!dados.turmaId) {
      ctx.addIssue({
        code: 'custom',
        path: ['turmaId'],
        message: i18n._(msg`Escolha uma turma para concluir a matrícula.`),
      })
    }
    if (dados.encarregados.filter((enc) => enc.principal).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['encarregados'],
        message: i18n._(msg`Escolha exatamente um encarregado principal.`),
      })
    }
    // Ignorar um possível duplicado exige justificação (guia 6.3)
    if (dados.duplicado.candidatos > 0 && !dados.duplicado.ignorado) {
      ctx.addIssue({
        code: 'custom',
        path: ['duplicado', 'ignorado'],
        message: i18n._(msg`Confirme se é o mesmo estudante antes de continuar.`),
      })
    }
    if (dados.transferencia.activa && dados.transferencia.escola.length < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['transferencia', 'escola'],
        message: i18n._(msg`Indique a escola de origem.`),
      })
    }
    if (dados.duplicado.ignorado && dados.duplicado.justificacao.length < 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['duplicado', 'justificacao'],
        message: i18n._(msg`Explique em poucas palavras porque não é o mesmo estudante.`),
      })
    }
  })

export type DadosMatricula = z.infer<typeof esquemaMatricula>

export const VALORES_INICIAIS: DadosMatricula = {
  estudante: {
    nome: '',
    dataNascimento: '',
    sexo: undefined as unknown as 'M',
    tipoDocumento: 'N/A',
    documentoIdentificacao: '',
    endereco: { streetAndNumber: '', neighborhood: '', municipality: '', province: '' },
    nacionalidade: '',
    fatherName: '',
    fatherContact: '',
    motherName: '',
    motherContact: '',
    bestLanguage: '',
    familyPrefix: '',
  },
  duplicado: { candidatos: 0, ignorado: false, justificacao: '' },
  encarregados: [{ nome: '', parentesco: '', telefone: '', email: '', principal: true }],
  documentosEntregues: [],
  classeId: '',
  turmaId: null,
  transferencia: { activa: false, escola: '', classesConcluidas: [] },
}

/** Campos validados ao sair de cada passo (guia 6.3: cada passo valida ao sair). */
export const CAMPOS_POR_PASSO = [
  [
    'estudante.nome',
    'estudante.dataNascimento',
    'estudante.sexo',
    'estudante.tipoDocumento',
    'estudante.documentoIdentificacao',
    'estudante.endereco.streetAndNumber',
    'estudante.endereco.neighborhood',
    'estudante.endereco.municipality',
    'estudante.endereco.province',
    'estudante.nacionalidade',
    'duplicado.candidatos',
    'duplicado.ignorado',
    'duplicado.justificacao',
  ],
  [
    'encarregados',
    'estudante.fatherName',
    'estudante.fatherContact',
    'estudante.motherName',
    'estudante.motherContact',
    'estudante.bestLanguage',
    'estudante.familyPrefix',
  ],
  ['documentosEntregues'],
  ['classeId', 'turmaId', 'transferencia'],
  [],
] as const

// TODO(contrato): vir de GET /tipos-documento quando o backend o publicar
export const TIPOS_DOCUMENTO = [
  { tipo: 'certidao-nascimento', designacao: msg`Certidão de nascimento`, obrigatorio: true },
  { tipo: 'bi', designacao: msg`Bilhete de identidade`, obrigatorio: true },
  { tipo: 'fotografias', designacao: msg`Duas fotografias tipo passe`, obrigatorio: true },
  { tipo: 'atestado-medico', designacao: msg`Atestado médico`, obrigatorio: true },
  {
    tipo: 'declaracao-anterior',
    designacao: msg`Declaração da escola anterior`,
    obrigatorio: false,
  },
] as const
