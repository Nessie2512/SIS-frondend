import { useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { entrar, meQuery, sair } from '@/entities/utilizador'
import { FormularioEntrada } from '@/features/autenticar'
import { sessao } from '@/shared/api'
import { INACTIVIDADE_MINUTOS } from '@/shared/config/constantes'
import { useInactivo } from '@/shared/lib/inactividade'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Dialogo, EcraBloqueado } from '@/shared/ui'

/**
 * Sessão expirada e bloqueio por inactividade (guia 2.6, 4.4). Ambos aparecem POR CIMA do
 * ecrã actual, que continua montado: o que estava a ser escrito não se perde.
 */
export function ProteccaoSessao() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { data: eu } = useQuery(meQuery())
  const [expirada, setExpirada] = useState(false)
  const [inactivo, desbloquear] = useInactivo(INACTIVIDADE_MINUTOS, !expirada)

  // Renovação falhou a meio do trabalho: pedir de novo as credenciais sem sair da rota
  useEffect(() => sessao.aoTerminar((motivo) => motivo === 'expirada' && setExpirada(true)), [])

  // sair() termina a sessão com motivo 'saida'; o layout limpa a memória e vai para a entrada
  const terminar = () => void sair()

  if (expirada) {
    return (
      <Dialogo
        aberta
        aoMudar={() => {}}
        titulo={t`A sessão terminou`}
        descricao={t`Entre de novo para continuar. O que estava a fazer continua neste ecrã.`}
      >
        <FormularioEntrada
          emailInicial={eu?.email}
          textoBotao={t`Continuar`}
          aoEntrar={() => {
            setExpirada(false)
            void queryClient.invalidateQueries()
          }}
        />
      </Dialogo>
    )
  }

  if (inactivo && eu) {
    return (
      <EcraBloqueado
        nome={eu.primeiroNome}
        aoSair={terminar}
        aoDesbloquear={async (palavraPasse) => {
          try {
            await entrar({ email: eu.email, palavraPasse })
            desbloquear()
          } catch (erro) {
            return mensagemDeErro(erro)
          }
        }}
      />
    )
  }

  return null
}
