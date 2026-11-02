import { Trans, useLingui } from '@lingui/react/macro'
import { Campo, Entrada } from './campo'
import { SelectorData } from './selector-data'
import type { DadosPessoa } from '@/shared/lib/pessoa'
import { ControloSegmentado } from './separadores'

interface Props {
  valor: DadosPessoa
  aoMudar: (valor: DadosPessoa) => void
  erros: Partial<Record<keyof DadosPessoa, string>>
}

/** Nome, sexo, nascimento, nacionalidade e morada angolana (rua, bairro, município, província). */
export function CamposPessoa({ valor, aoMudar, erros }: Props) {
  const { t } = useLingui()
  const mudar = <K extends keyof DadosPessoa>(campo: K, v: DadosPessoa[K]) =>
    aoMudar({ ...valor, [campo]: v })
  const texto = (
    campo: 'nome' | 'nacionalidade' | 'rua' | 'bairro' | 'municipio' | 'provincia',
    rotulo: string,
    autoComplete?: string,
  ) => (
    <Campo rotulo={rotulo} erro={erros[campo]} obrigatorio>
      {(c) => (
        <Entrada
          {...c}
          autoComplete={autoComplete}
          value={valor[campo]}
          onChange={(e) => mudar(campo, e.target.value)}
        />
      )}
    </Campo>
  )
  return (
    <>
      {texto('nome', t`Nome completo`, 'name')}
      <div className="flex flex-col gap-1.5">
        <span className="text-legenda text-texto-2">
          <Trans>Sexo</Trans>
        </span>
        <ControloSegmentado
          rotulo={t`Sexo`}
          valor={valor.sexo}
          aoMudar={(v) => mudar('sexo', v as 'M' | 'F')}
          opcoes={[
            { valor: 'F', rotulo: t`Feminino` },
            { valor: 'M', rotulo: t`Masculino` },
          ]}
        />
      </div>
      <SelectorData
        rotulo={t`Data de nascimento`}
        valor={valor.dataNascimento}
        aoMudar={(v) => mudar('dataNascimento', v)}
        erro={erros.dataNascimento}
        obrigatorio
      />
      {texto('nacionalidade', t`Nacionalidade`)}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-subtitulo">
          <Trans>Morada</Trans>
        </legend>
        {texto('rua', t`Rua e número`, 'address-line1')}
        {texto('bairro', t`Bairro`, 'address-line2')}
        {texto('municipio', t`Município`, 'address-level2')}
        {texto('provincia', t`Província`, 'address-level1')}
      </fieldset>
    </>
  )
}
