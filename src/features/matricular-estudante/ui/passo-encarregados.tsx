import { Trans, useLingui } from '@lingui/react/macro'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button, Campo, Entrada } from '@/shared/ui'
import type { DadosMatricula } from '../model/esquema'

/** Passo 2: encarregados. Um encarregado pode ser partilhado por irmãos: o servidor reconhece-o pelo telefone. */
export function PassoEncarregados() {
  const { t } = useLingui()
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<DadosMatricula>()
  const { fields, append, remove } = useFieldArray({ control, name: 'encarregados' })
  const dadosEstudante = errors.estudante

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid gap-4 rounded-cartao bg-superficie p-4 ring-1 ring-linha sm:grid-cols-2">
        <legend className="px-1 text-subtitulo">
          <Trans>Dados familiares</Trans>
        </legend>
        <Campo rotulo={t`Nome do pai`} obrigatorio erro={dadosEstudante?.fatherName?.message}>
          {(c) => <Entrada {...c} {...register('estudante.fatherName')} />}
        </Campo>
        <Campo rotulo={t`Contacto do pai`} obrigatorio erro={dadosEstudante?.fatherContact?.message}>
          {(c) => (
            <Entrada {...c} inputMode="tel" {...register('estudante.fatherContact')} />
          )}
        </Campo>
        <Campo rotulo={t`Nome da mãe`} obrigatorio erro={dadosEstudante?.motherName?.message}>
          {(c) => <Entrada {...c} {...register('estudante.motherName')} />}
        </Campo>
        <Campo
          rotulo={t`Contacto da mãe`}
          obrigatorio
          erro={dadosEstudante?.motherContact?.message}
        >
          {(c) => (
            <Entrada {...c} inputMode="tel" {...register('estudante.motherContact')} />
          )}
        </Campo>
        <Campo
          rotulo={t`Idioma preferencial`}
          obrigatorio
          erro={dadosEstudante?.bestLanguage?.message}
        >
          {(c) => <Entrada {...c} {...register('estudante.bestLanguage')} />}
        </Campo>
        <Campo
          rotulo={t`Prefixo familiar`}
          obrigatorio
          erro={dadosEstudante?.familyPrefix?.message}
          descricao={t`Ex.: FAM-SILVA`}
        >
          {(c) => <Entrada {...c} {...register('estudante.familyPrefix')} />}
        </Campo>
      </fieldset>
      {fields.map((campo, i) => {
        const e = errors.encarregados?.[i]
        const numero = i + 1
        return (
          <fieldset
            key={campo.id}
            className="flex flex-col gap-4 rounded-cartao bg-superficie p-4 ring-1 ring-linha"
          >
            <legend className="sr-only">{t`Encarregado ${numero}`}</legend>
            <div className="flex items-center justify-between">
              <p className="text-subtitulo">{t`Encarregado ${numero}`}</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-secundario">
                  <input
                    type="radio"
                    name="encarregado-principal"
                    checked={campo.principal}
                    onChange={() =>
                      fields.forEach((_, j) => setValue(`encarregados.${j}.principal`, j === i))
                    }
                    className="size-4 accent-(--color-acento)"
                  />
                  <Trans>Principal</Trans>
                </label>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    tamanho="icone"
                    variante="discreto"
                    aria-label={t`Retirar encarregado ${numero}`}
                    onClick={() => remove(i)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo={t`Nome completo`} obrigatorio erro={e?.nome?.message}>
                {(c) => <Entrada {...c} {...register(`encarregados.${i}.nome`)} />}
              </Campo>
              <Campo
                rotulo={t`Parentesco`}
                obrigatorio
                erro={e?.parentesco?.message}
                descricao={t`Ex.: Mãe, Pai, Tia`}
              >
                {(c) => (
                  <Entrada
                    {...c}
                    list="parentescos"
                    {...register(`encarregados.${i}.parentesco`)}
                  />
                )}
              </Campo>
              <Campo rotulo={t`Telefone`} obrigatorio erro={e?.telefone?.message}>
                {(c) => (
                  <Entrada {...c} inputMode="tel" {...register(`encarregados.${i}.telefone`)} />
                )}
              </Campo>
              <Campo rotulo={t`Email`} erro={e?.email?.message}>
                {(c) => <Entrada {...c} type="email" {...register(`encarregados.${i}.email`)} />}
              </Campo>
            </div>
          </fieldset>
        )
      })}
      <datalist id="parentescos">
        {[t`Mãe`, t`Pai`, t`Avó`, t`Avô`, t`Tia`, t`Tio`, t`Irmã`, t`Irmão`].map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {(errors.encarregados?.root ?? errors.encarregados?.message) && (
        <p role="alert" className="text-secundario text-perigo">
          {errors.encarregados.root?.message ?? errors.encarregados.message}
        </p>
      )}
      <div>
        <Button
          type="button"
          onClick={() =>
            append({ nome: '', parentesco: '', telefone: '', email: '', principal: false })
          }
        >
          <Plus aria-hidden />
          <Trans>Acrescentar encarregado</Trans>
        </Button>
      </div>
    </div>
  )
}
