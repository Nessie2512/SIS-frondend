import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { FilePlus2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { documentosOficiaisQuery } from '@/entities/documento-oficial'
import { estudantesQuery } from '@/entities/estudante'
import { TEMPOS } from '@/shared/config/constantes'
import { Button, Campo, Dialogo, Entrada, Esqueleto } from '@/shared/ui'
import { FolhaEmitir } from './documentos-oficiais'

interface Escolhido {
  id: string
  nome: string
}

/**
 * Emitir a partir da área Documentos (guia 2.5): primeiro o estudante, depois a mesma folha de
 * emissão da ficha, com os tipos disponíveis para ele e a pré-visualização ao lado.
 */
export function EmitirDocumentoGlobal({ anoLectivoId }: { anoLectivoId: string }) {
  const [aEscolher, setAEscolher] = useState(false)
  const [estudante, setEstudante] = useState<Escolhido>()
  return (
    <>
      <Button variante="primario" onClick={() => setAEscolher(true)}>
        <FilePlus2 aria-hidden className="size-4 stroke-[1.5]" />
        <Trans>Emitir documento</Trans>
      </Button>
      <EscolherEstudante
        anoLectivoId={anoLectivoId}
        aberta={aEscolher}
        aoFechar={() => setAEscolher(false)}
        aoEscolher={(e) => {
          setAEscolher(false)
          setEstudante(e)
        }}
      />
      {estudante && (
        <FolhaDoEstudante estudante={estudante} aoFechar={() => setEstudante(undefined)} />
      )}
    </>
  )
}

function FolhaDoEstudante({ estudante, aoFechar }: { estudante: Escolhido; aoFechar: () => void }) {
  const { data } = useQuery(documentosOficiaisQuery(estudante.id))
  return (
    <FolhaEmitir
      estudanteId={estudante.id}
      nome={estudante.nome}
      tipos={data?.tipos ?? []}
      aberta={Boolean(data)}
      aoFechar={aoFechar}
    />
  )
}

function EscolherEstudante({
  anoLectivoId,
  aberta,
  aoFechar,
  aoEscolher,
}: {
  anoLectivoId: string
  aberta: boolean
  aoFechar: () => void
  aoEscolher: (e: Escolhido) => void
}) {
  const { t } = useLingui()
  const [texto, setTexto] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  useEffect(() => {
    const espera = setTimeout(() => setPesquisa(texto.trim()), TEMPOS.pesquisaEspera)
    return () => clearTimeout(espera)
  }, [texto])
  const { data, isPlaceholderData } = useQuery({
    ...estudantesQuery({ anoLectivoId, pesquisa: pesquisa || undefined, page: 1 }),
    enabled: aberta && pesquisa.length >= 2,
  })
  const resultados = data?.estudantes.slice(0, 8) ?? []

  function fechar() {
    setTexto('')
    setPesquisa('')
    aoFechar()
  }

  return (
    <Dialogo
      aberta={aberta}
      aoMudar={(v) => !v && fechar()}
      titulo={t`Emitir documento`}
      descricao={t`Para quem é o documento?`}
      rodape={
        <Button onClick={fechar}>
          <Trans>Cancelar</Trans>
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Campo rotulo={t`Estudante`} descricao={t`Nome ou número de processo.`}>
          {(c) => (
            <Entrada
              {...c}
              type="search"
              prefixo={<Search aria-hidden />}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          )}
        </Campo>
        {pesquisa.length >= 2 &&
          (!data ? (
            <Esqueleto className="h-24 w-full" />
          ) : resultados.length === 0 ? (
            <p className="text-secundario text-texto-2" role="status">
              <Trans>Nenhum estudante encontrado.</Trans>
            </p>
          ) : (
            <ul
              aria-label={t`Estudantes encontrados`}
              className="flex max-h-72 flex-col overflow-y-auto rounded-cartao ring-1 ring-linha"
              aria-busy={isPlaceholderData || undefined}
            >
              {resultados.map((e) => {
                const processo = e.numeroProcesso
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => aoEscolher({ id: e.id, nome: e.nome })}
                      className="flex min-h-10 w-full flex-col items-start px-3 py-2 text-left hover:bg-fundo focus-visible:bg-fundo focus-visible:outline-none"
                    >
                      <span className="font-medium">{e.nome}</span>
                      <span className="tabular text-secundario text-texto-2">
                        {t`Processo n.º ${processo}`}
                        {e.matricula && <> · {e.matricula}</>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ))}
      </div>
    </Dialogo>
  )
}
