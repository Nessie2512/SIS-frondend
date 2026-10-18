import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { entrar, type Utilizador } from '@/entities/utilizador'
import { eApiError } from '@/shared/api'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Aviso, Button, Campo, Entrada, ResumoErros } from '@/shared/ui'
import { errosDoFormulario } from '@/shared/lib/erros-formulario'
import { esquemaEntrada, type DadosEntrada } from '../model/esquema'

interface Props {
  /** Email já conhecido (ex.: sessão expirada do mesmo utilizador) */
  emailInicial?: string
  aoEntrar: (utilizador: Utilizador) => void
  textoBotao?: string
}

/**
 * Formulário de entrada (guia 4.4, 7.2): valida ao sair do campo, foco no primeiro erro,
 * mensagem calma e sem códigos quando as credenciais falham.
 */
export function FormularioEntrada({ emailInicial = '', aoEntrar, textoBotao }: Props) {
  const { t } = useLingui()
  const [erroGeral, setErroGeral] = useState<string>()
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<DadosEntrada>({
    resolver: zodResolver(esquemaEntrada),
    mode: 'onTouched',
    defaultValues: { email: emailInicial, palavraPasse: '' },
  })
  // Resumo de erros no topo ao submeter (guia 7.2, 8.1)
  const ROTULOS: Record<string, string> = { email: t`Email`, palavraPasse: t`Palavra-passe` }
  const erros = submitCount ? errosDoFormulario(errors, (c) => ROTULOS[c]) : []

  const submeter = handleSubmit(async (dados) => {
    setErroGeral(undefined)
    try {
      aoEntrar(await entrar(dados))
    } catch (erro) {
      setErroGeral(
        eApiError(erro) && erro.status === 401
          ? t`O email ou a palavra-passe não estão correctos.`
          : mensagemDeErro(erro),
      )
    }
  })

  return (
    <form onSubmit={submeter} noValidate className="flex flex-col gap-4">
      <ResumoErros erros={erros} aoEscolher={(c) => setFocus(c as FieldPath<DadosEntrada>)} />
      {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
      <Campo rotulo={t`Email`} erro={errors.email?.message} obrigatorio>
        {(c) => <Entrada {...c} type="email" autoComplete="username" {...register('email')} />}
      </Campo>
      <Campo rotulo={t`Palavra-passe`} erro={errors.palavraPasse?.message} obrigatorio>
        {(c) => (
          <Entrada
            {...c}
            type="password"
            autoComplete="current-password"
            {...register('palavraPasse')}
          />
        )}
      </Campo>
      <Button type="submit" variante="primario" aCarregar={isSubmitting} className="mt-2">
        {textoBotao ?? <Trans>Entrar</Trans>}
      </Button>
    </form>
  )
}
