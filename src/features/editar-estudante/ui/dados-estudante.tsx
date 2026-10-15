import { Trans, useLingui } from '@lingui/react/macro'
import { formatarTelefone, type Estudante } from '@/entities/estudante'
import { formatarDataCivil } from '@/shared/lib/datas'
import { useCan } from '@/shared/lib/permissoes'
import { Button, Dialogo, EdicaoNoSitio } from '@/shared/ui'
import { useEditarEstudante, type CampoEditavel } from '../model/use-editar-estudante'

interface Props {
  estudante: Estudante
  /** Ano encerrado: só leitura (guia 2.4) */
  soLeitura: boolean
}

/** Dados pessoais da ficha com edição no sítio (guia 6.3, 7.2). */
export function DadosEstudante({ estudante, soLeitura }: Props) {
  const { t } = useLingui()
  const podeEscrever = useCan('estudantes:escrever')
  const { guardar, conflito, manterActual, guardarOMeu } = useEditarEstudante(estudante.id)

  const razao = !podeEscrever
    ? undefined // sem permissão: nem se oferece a edição
    : soLeitura
      ? t`O ano lectivo está encerrado. Só é possível consultar.`
      : undefined

  const ROTULOS: Record<CampoEditavel, string> = {
    nome: t`Nome completo`,
    telefone: t`Telefone`,
    morada: t`Morada`,
  }

  const editavel = (
    campo: CampoEditavel,
    extra: Partial<Parameters<typeof EdicaoNoSitio>[0]> = {},
  ) =>
    podeEscrever ? (
      <EdicaoNoSitio
        rotulo={ROTULOS[campo]}
        valor={estudante[campo]}
        aoGuardar={(v) => guardar(campo, v)}
        desactivadoPorque={razao}
        {...extra}
      />
    ) : (
      <Linha
        rotulo={ROTULOS[campo]}
        valor={extra.mostrar ? extra.mostrar(estudante[campo]) : estudante[campo]}
      />
    )

  return (
    <section aria-labelledby="dados-pessoais" className="flex flex-col">
      <h2 id="dados-pessoais" className="mb-2 text-titulo-seccao">
        <Trans>Dados pessoais</Trans>
      </h2>
      <div className="divide-y divide-linha">
        {editavel('nome', {
          autoComplete: 'off',
          validar: (v) => (v.split(/\s+/).length < 2 ? t`Escreva o nome completo.` : undefined),
        })}
        {/* Número de processo é imutável: sempre texto, nunca campo (guia 2.4) */}
        <Linha rotulo={t`Número de processo`} valor={estudante.numeroProcesso} tabular />
        <Linha
          rotulo={t`Data de nascimento`}
          valor={formatarDataCivil(estudante.dataNascimento)}
          tabular
        />
        <Linha
          rotulo={t`Documento de identificação`}
          valor={estudante.documentoIdentificacao}
          tabular
        />
        <Linha rotulo={t`Naturalidade`} valor={estudante.naturalidade} />
        {editavel('telefone', {
          inputMode: 'tel',
          autoComplete: 'tel',
          mostrar: formatarTelefone,
          validar: (v) =>
            v && !/^9\d{8}$/.test(v.replace(/\s/g, ''))
              ? t`O telefone tem 9 dígitos e começa por 9.`
              : undefined,
        })}
        {editavel('morada', { autoComplete: 'street-address' })}
      </div>

      <Dialogo
        aberta={Boolean(conflito)}
        aoMudar={(aberta) => !aberta && manterActual()}
        titulo={t`Outra pessoa alterou este dado`}
        descricao={t`Enquanto editava, o valor mudou no servidor. Escolha qual manter.`}
        rodape={
          <>
            <Button onClick={manterActual}>
              <Trans>Manter o actual</Trans>
            </Button>
            <Button variante="primario" onClick={() => void guardarOMeu()}>
              <Trans>Guardar o meu</Trans>
            </Button>
          </>
        }
      >
        {conflito && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-texto-2">
              <Trans>Valor actual</Trans>
            </dt>
            <dd className="font-medium">{conflito.actual ?? '—'}</dd>
            <dt className="text-texto-2">
              <Trans>O seu valor</Trans>
            </dt>
            <dd className="font-medium">{conflito.meu || '—'}</dd>
          </dl>
        )}
      </Dialogo>
    </section>
  )
}

function Linha({
  rotulo,
  valor,
  tabular,
}: {
  rotulo: string
  valor: string | null
  tabular?: boolean
}) {
  return (
    <div className="grid grid-cols-[13rem_1fr] items-center gap-x-6 py-2">
      <span className="text-texto-2">{rotulo}</span>
      <span className={tabular ? 'tabular flex min-h-9 items-center' : 'flex min-h-9 items-center'}>
        {valor ?? <span className="text-texto-3">—</span>}
      </span>
    </div>
  )
}
