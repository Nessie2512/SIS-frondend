import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Controller, useFormContext } from 'react-hook-form'
import { Aviso } from '@/shared/ui'
import { TIPOS_DOCUMENTO, type DadosMatricula } from '../model/esquema'

/**
 * Passo 3: documentos entregues no acto. A matrícula fica "a confirmar" enquanto faltarem
 * obrigatórios; o botão Confirmar da ficha só activa com a lista completa (guia 2.4).
 */
export function PassoDocumentos() {
  const { t, i18n } = useLingui()
  const { control } = useFormContext<DadosMatricula>()

  return (
    <Controller
      control={control}
      name="documentosEntregues"
      render={({ field }) => {
        const emFalta = TIPOS_DOCUMENTO.filter(
          (d) => d.obrigatorio && !field.value.includes(d.tipo),
        ).length
        return (
          <div className="flex flex-col gap-4">
            <fieldset className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha">
              <legend className="sr-only">{t`Documentos entregues`}</legend>
              {TIPOS_DOCUMENTO.map((d) => (
                <label key={d.tipo} className="flex h-linha cursor-pointer items-center gap-3 px-4">
                  <input
                    type="checkbox"
                    checked={field.value.includes(d.tipo)}
                    onChange={(e) =>
                      field.onChange(
                        e.target.checked
                          ? [...field.value, d.tipo]
                          : field.value.filter((x) => x !== d.tipo),
                      )
                    }
                    className="size-4 accent-(--color-acento)"
                  />
                  <span className="flex-1">{i18n._(d.designacao)}</span>
                  {!d.obrigatorio && (
                    <span className="text-secundario text-texto-3">
                      <Trans>opcional</Trans>
                    </span>
                  )}
                </label>
              ))}
            </fieldset>
            {emFalta > 0 ? (
              <Aviso tom="aviso">
                {plural(emFalta, {
                  one: 'Falta # documento obrigatório. A matrícula fica a confirmar até ser entregue.',
                  other:
                    'Faltam # documentos obrigatórios. A matrícula fica a confirmar até serem entregues.',
                })}
              </Aviso>
            ) : (
              <Aviso tom="informacao">{t`Documentos obrigatórios completos: a matrícula fica confirmada.`}</Aviso>
            )}
          </div>
        )
      }}
    />
  )
}
