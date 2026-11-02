import { Trans, useLingui } from '@lingui/react/macro'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { rotuloPapel } from '@/entities/administracao'
import { eApiError } from '@/shared/api'
import { PAPEIS, type Papel } from '@/shared/config/papeis'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { camposPessoaEmFalta, PESSOA_VAZIA, type DadosPessoa } from '@/shared/lib/pessoa'
import {
  Aviso,
  Button,
  Campo,
  CamposPessoa,
  Entrada,
  Folha,
  notificar,
  ResumoErros,
  Selector,
} from '@/shared/ui'
import { useCriarConta } from '../model/use-contas'

/** Campos do backend → campos do formulário. */
const CAMPO_DO_SERVIDOR: Record<string, string> = {
  name: 'nome',
  birthDate: 'dataNascimento',
  nationality: 'nacionalidade',
  email: 'email',
  role: 'papel',
  password: 'palavraPasse',
}

/** Nova conta (backend SIS: POST /users), em folha lateral (guia 7.3). */
export function NovaConta() {
  const { t } = useLingui()
  const criar = useCriarConta()
  const [aberta, setAberta] = useState(false)
  const [pessoa, setPessoa] = useState<DadosPessoa>(PESSOA_VAZIA)
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState<Papel | null>(null)
  const [palavraPasse, setPalavraPasse] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string>()

  const ROTULOS: Record<string, string> = {
    nome: t`Nome completo`,
    dataNascimento: t`Data de nascimento`,
    nacionalidade: t`Nacionalidade`,
    rua: t`Rua e número`,
    bairro: t`Bairro`,
    municipio: t`Município`,
    provincia: t`Província`,
    email: t`Email`,
    papel: t`Perfil`,
    palavraPasse: t`Palavra-passe inicial`,
  }
  const resumo = Object.entries(ROTULOS).flatMap(([campo, rotulo]) =>
    erros[campo] ? [{ campo, rotulo, mensagem: erros[campo] }] : [],
  )

  function limpar() {
    setPessoa(PESSOA_VAZIA)
    setEmail('')
    setPapel(null)
    setPalavraPasse('')
    setErros({})
    setErroGeral(undefined)
  }

  function gravar() {
    const locais: Record<string, string> = {}
    for (const campo of camposPessoaEmFalta(pessoa)) locais[campo] = t`Preencha este campo.`
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) locais.email = t`Escreva um email válido.`
    if (!papel) locais.papel = t`Escolha o perfil.`
    if (palavraPasse.length < 12 || palavraPasse.length > 128) {
      locais.palavraPasse = t`A palavra-passe tem de 12 a 128 caracteres.`
    }
    setErros(locais)
    setErroGeral(undefined)
    if (Object.keys(locais).length || !papel) return
    criar.mutate(
      { ...pessoa, email, papel, palavraPasse },
      {
        onSuccess: () => {
          const nome = pessoa.nome.trim()
          notificar.sucesso(t`Conta de ${nome} criada.`)
          anunciar.educado(t`Conta de ${nome} criada.`)
          setAberta(false)
          limpar()
        },
        onError: (e) => {
          const deCampo = eApiError(e) ? e.errors : []
          if (deCampo.length) {
            setErros(
              Object.fromEntries(
                deCampo.map((x) => [CAMPO_DO_SERVIDOR[x.campo] ?? x.campo, x.mensagem]),
              ),
            )
          } else setErroGeral(mensagemDeErro(e))
        },
      },
    )
  }

  return (
    <>
      <Button variante="primario" data-atalho="novo" onClick={() => setAberta(true)}>
        <UserPlus aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Nova conta</Trans>
      </Button>
      <Folha
        aberta={aberta}
        aoMudar={setAberta}
        pendente={criar.isPending}
        titulo={t`Nova conta`}
        descricao={t`A pessoa entra com o email e a palavra-passe inicial, e muda-a depois.`}
        rodape={
          <>
            <Button
              disabled={criar.isPending}
              onClick={() => {
                setAberta(false)
                limpar()
              }}
            >
              <Trans>Cancelar</Trans>
            </Button>
            <Button variante="primario" aCarregar={criar.isPending} onClick={gravar}>
              <Trans>Criar conta</Trans>
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
          <ResumoErros erros={resumo} />
          <CamposPessoa valor={pessoa} aoMudar={setPessoa} erros={erros} />
          <Campo rotulo={t`Email`} erro={erros.email} obrigatorio>
            {(c) => (
              <Entrada
                {...c}
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo={t`Perfil`} erro={erros.papel} obrigatorio>
            {(c) => (
              <Selector
                {...c}
                opcoes={PAPEIS.map((p) => ({ valor: p, rotulo: rotuloPapel(p) }))}
                valor={papel}
                aoMudar={(v) => setPapel(v as Papel | null)}
              />
            )}
          </Campo>
          <Campo
            rotulo={t`Palavra-passe inicial`}
            descricao={t`De 12 a 128 caracteres. Entregue-a à pessoa por um canal seguro.`}
            erro={erros.palavraPasse}
            obrigatorio
          >
            {(c) => (
              <Entrada
                {...c}
                type="password"
                autoComplete="new-password"
                value={palavraPasse}
                onChange={(e) => setPalavraPasse(e.target.value)}
              />
            )}
          </Campo>
        </div>
      </Folha>
    </>
  )
}
