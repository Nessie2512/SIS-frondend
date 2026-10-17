import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Copy, Download, FilePlus2, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  documentosOficiaisQuery,
  preVisualizacaoQuery,
  type DocumentoOficial,
  type TipoDocumentoOficial,
} from '@/entities/documento-oficial'
import { eApiError, novaChaveIdempotencia } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { formatarInstante } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  AreaTexto,
  Aviso,
  Button,
  Campo,
  Dialogo,
  Entrada,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  Folha,
  notificar,
} from '@/shared/ui'
import { useAnularDocumento, useEmitirDocumento } from '../model/use-documentos'

interface Props {
  estudanteId: string
  nome: string
  podeEmitir: boolean
}

/**
 * Documentos oficiais do estudante (guia 2.1, 2.5, 6.3): histórico dos emitidos e emissão numa
 * folha com pré-visualização ao lado. Anulados continuam visíveis, riscados e com o motivo.
 */
export function DocumentosOficiais({ estudanteId, nome, podeEmitir }: Props) {
  const { t } = useLingui()
  const { data } = useQuery(documentosOficiaisQuery(estudanteId))
  const [aEmitir, setAEmitir] = useState(false)
  const [aAnular, setAAnular] = useState<DocumentoOficial>()
  if (!data) return <Esqueleto className="h-48 w-full" />

  return (
    <section aria-labelledby="oficiais-titulo" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="oficiais-titulo" className="text-titulo-seccao">
          <Trans>Documentos oficiais</Trans>
        </h2>
        {podeEmitir && (
          <Button onClick={() => setAEmitir(true)}>
            <FilePlus2 aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Emitir documento</Trans>
          </Button>
        )}
      </div>
      {data.emitidos.length === 0 ? (
        <EstadoVazio
          titulo={t`Ainda não foram emitidos documentos oficiais.`}
          descricao={t`Declarações, guias e certificados emitidos ficam aqui, com número e código de verificação.`}
        />
      ) : (
        <ul
          aria-label={t`Documentos emitidos`}
          className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha"
        >
          {data.emitidos.map((d) => (
            <LinhaDocumento
              key={d.id}
              documento={d}
              podeAnular={podeEmitir}
              aoAnular={() => setAAnular(d)}
            />
          ))}
        </ul>
      )}
      {podeEmitir && (
        <FolhaEmitir
          estudanteId={estudanteId}
          nome={nome}
          tipos={data.tipos}
          aberta={aEmitir}
          aoFechar={() => setAEmitir(false)}
        />
      )}
      <DialogoAnular
        estudanteId={estudanteId}
        documento={aAnular}
        aoFechar={() => setAAnular(undefined)}
      />
    </section>
  )
}

function copiar(texto: string, mensagem: string) {
  void navigator.clipboard?.writeText(texto).then(
    () => notificar.sucesso(mensagem),
    () => undefined,
  )
}

function LinhaDocumento({
  documento: d,
  podeAnular,
  aoAnular,
}: {
  documento: DocumentoOficial
  podeAnular: boolean
  aoAnular: () => void
}) {
  const { t } = useLingui()
  const anulado = d.estado === 'ANULADO'
  const titulo = d.titulo
  const numero = d.numero
  const quando = formatarInstante(d.emitidoEm)
  const quem = d.emitidoPor
  const codigo = d.codigoVerificacao
  const motivo = d.motivoAnulacao
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <FileText aria-hidden className="size-4 stroke-[1.5] text-texto-3" />
        <span className={cn('font-medium', anulado && 'text-texto-3 line-through')}>{titulo}</span>
        <span className={cn('tabular text-secundario text-texto-2', anulado && 'line-through')}>
          {numero}
        </span>
        {anulado ? (
          <EtiquetaEstado tom="perigo">{t`Anulado`}</EtiquetaEstado>
        ) : (
          <EtiquetaEstado tom="sucesso">{t`Válido`}</EtiquetaEstado>
        )}
      </div>
      <p className="tabular text-secundario text-texto-2">
        {t`Emitido a ${quando} por ${quem}`} · <Trans>código</Trans>{' '}
        <span className="font-mono text-texto-1">{codigo}</span>
        {d.finalidade && <> · {d.finalidade}</>}
      </p>
      {anulado && motivo && (
        <p className="text-secundario text-perigo">{t`Motivo da anulação: ${motivo}`}</p>
      )}
      <div className="flex flex-wrap gap-3 text-secundario">
        <a
          href={d.pdfUrl}
          download
          aria-label={t`Descarregar ${titulo} ${numero}`}
          className="inline-flex items-center gap-1 text-acento hover:underline"
        >
          <Download aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Descarregar PDF</Trans>
        </a>
        {!anulado && podeAnular && (
          <button
            type="button"
            onClick={aoAnular}
            aria-label={t`Anular ${titulo} ${numero}`}
            className="text-perigo hover:underline"
          >
            <Trans>Anular</Trans>
          </button>
        )}
      </div>
    </li>
  )
}

function FolhaEmitir({
  estudanteId,
  nome,
  tipos,
  aberta,
  aoFechar,
}: {
  estudanteId: string
  nome: string
  tipos: { tipo: TipoDocumentoOficial; titulo: string; disponivel: boolean; razao: string | null }[]
  aberta: boolean
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const emitir = useEmitirDocumento(estudanteId)
  const [chave, setChave] = useState(novaChaveIdempotencia)
  const [tipo, setTipo] = useState<TipoDocumentoOficial | null>(null)
  const [finalidade, setFinalidade] = useState('')
  const [finalidadeVista, setFinalidadeVista] = useState('')
  const [revisto, setRevisto] = useState(false)
  const [emitido, setEmitido] = useState<DocumentoOficial>()
  const [erro, setErro] = useState<string>()

  // A pré-visualização acompanha a finalidade sem pedir a cada tecla
  useEffect(() => {
    const espera = setTimeout(() => setFinalidadeVista(finalidade.trim()), 400)
    return () => clearTimeout(espera)
  }, [finalidade])
  const { data: conteudo, isFetching } = useQuery(
    preVisualizacaoQuery(estudanteId, tipo, finalidadeVista),
  )

  function fechar() {
    setTipo(null)
    setFinalidade('')
    setFinalidadeVista('')
    setRevisto(false)
    setEmitido(undefined)
    setErro(undefined)
    setChave(novaChaveIdempotencia())
    aoFechar()
  }

  function emitirAgora() {
    if (!tipo) return
    setErro(undefined)
    emitir.mutate(
      { tipo, finalidade: finalidade.trim(), chave },
      {
        onSuccess: (d) => {
          setEmitido(d)
          const numero = d.numero
          anunciar.educado(t`Documento emitido com o número ${numero}.`)
        },
        onError: (e) => setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e)),
      },
    )
  }

  const pronto = Boolean(tipo && revisto && conteudo && !isFetching)
  const verbo =
    tipo === 'GUIA_TRANSFERENCIA'
      ? t`Emitir guia`
      : tipo === 'CERTIFICADO_HABILITACOES'
        ? t`Emitir certificado`
        : t`Emitir declaração`

  return (
    <Folha
      larga
      aberta={aberta}
      aoMudar={(v) => !v && fechar()}
      pendente={emitir.isPending}
      titulo={emitido ? t`Documento emitido` : t`Emitir documento`}
      descricao={nome}
      rodape={
        emitido ? (
          <Button variante="primario" onClick={fechar}>
            <Trans>Concluir</Trans>
          </Button>
        ) : (
          <>
            <Button onClick={fechar} disabled={emitir.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button
              variante="primario"
              disabled={!pronto}
              aCarregar={emitir.isPending}
              onClick={emitirAgora}
            >
              {verbo}
            </Button>
          </>
        )
      }
    >
      {emitido ? (
        <Emitido documento={emitido} />
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
          <div className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-legenda text-texto-2">
                <Trans>Tipo de documento</Trans>
              </legend>
              {tipos.map((x) => (
                <label
                  key={x.tipo}
                  className={cn(
                    'flex items-start gap-3 rounded-cartao bg-superficie px-3 py-2.5 ring-1 ring-linha',
                    x.disponivel
                      ? 'cursor-pointer has-checked:ring-2 has-checked:ring-acento'
                      : 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="tipo-documento"
                    value={x.tipo}
                    checked={tipo === x.tipo}
                    disabled={!x.disponivel}
                    aria-describedby={x.razao ? `razao-${x.tipo}` : undefined}
                    onChange={() => {
                      setTipo(x.tipo)
                      setRevisto(false)
                    }}
                    className="mt-0.5 size-4 accent-(--color-acento)"
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{x.titulo}</span>
                    {x.razao && (
                      <span id={`razao-${x.tipo}`} className="text-secundario text-texto-2">
                        {x.razao}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
            <Campo rotulo={t`Para efeitos de`} descricao={t`Opcional. Ex.: abono de família.`}>
              {(c) => (
                <Entrada
                  {...c}
                  value={finalidade}
                  onChange={(e) => setFinalidade(e.target.value)}
                />
              )}
            </Campo>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <label
              className={cn(
                'flex items-start gap-3 rounded-cartao p-3 ring-1 ring-linha',
                tipo ? 'cursor-pointer' : 'opacity-60',
              )}
            >
              <input
                type="checkbox"
                checked={revisto}
                disabled={!tipo}
                onChange={(e) => setRevisto(e.target.checked)}
                className="mt-0.5 size-4 accent-(--color-acento)"
              />
              <span className="text-secundario">
                <Trans>
                  Revi o documento. Sei que emitir não se desfaz: um documento emitido só se anula,
                  com motivo.
                </Trans>
              </span>
            </label>
          </div>
          <PreVisualizacao
            titulo={conteudo?.titulo}
            paragrafos={conteudo?.paragrafos}
            aCarregar={Boolean(tipo) && (!conteudo || isFetching)}
            semTipo={!tipo}
          />
        </div>
      )}
    </Folha>
  )
}

/** A folha como vai sair (o PDF é gerado no servidor com o mesmo texto). */
function PreVisualizacao({
  titulo,
  paragrafos,
  aCarregar,
  semTipo,
}: {
  titulo?: string
  paragrafos?: string[]
  aCarregar: boolean
  semTipo: boolean
}) {
  const { t } = useLingui()
  return (
    <section
      aria-label={t`Pré-visualização do documento`}
      className="min-w-0 rounded-cartao bg-fundo p-4"
    >
      {semTipo ? (
        <p className="py-16 text-center text-secundario text-texto-2">
          <Trans>Escolha o tipo para ver o documento.</Trans>
        </p>
      ) : (
        <div
          className={cn(
            'papel mx-auto flex aspect-[210/297] w-full max-w-[28rem] flex-col gap-3 overflow-hidden p-8 text-[10pt] shadow-elevado ring-1 ring-linha transition-opacity',
            aCarregar && 'opacity-60',
          )}
        >
          <p className="text-legenda tracking-wide text-texto-2 uppercase">
            <Trans>Secretaria escolar</Trans>
          </p>
          {titulo ? (
            <>
              <h3 className="text-center text-[12pt] font-semibold uppercase">{titulo}</h3>
              <p className="text-center text-texto-3">
                <Trans>N.º e código de verificação atribuídos ao emitir</Trans>
              </p>
              {paragrafos?.map((p, i) => (
                <p key={i} className="text-justify leading-relaxed">
                  {p}
                </p>
              ))}
            </>
          ) : (
            <div className="flex flex-col gap-2" aria-hidden>
              <Esqueleto className="mx-auto h-4 w-1/2" />
              <Esqueleto className="h-3 w-full" />
              <Esqueleto className="h-3 w-full" />
              <Esqueleto className="h-3 w-2/3" />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Emitido({ documento: d }: { documento: DocumentoOficial }) {
  const { t } = useLingui()
  const titulo = d.titulo
  const numero = d.numero
  const codigo = d.codigoVerificacao
  return (
    <div className="flex max-w-md flex-col gap-5">
      <Aviso tom="informacao">{t`Documento emitido: ${titulo}. Guarde o número e o código de verificação.`}</Aviso>
      <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3">
        <dt className="text-texto-2">
          <Trans>Número</Trans>
        </dt>
        <dd className="tabular text-subtitulo">{numero}</dd>
        <dd>
          <Button
            tamanho="compacto"
            variante="discreto"
            aria-label={t`Copiar o número`}
            onClick={() => copiar(numero, t`Número copiado.`)}
          >
            <Copy aria-hidden className="size-4 stroke-[1.5]" />
          </Button>
        </dd>
        <dt className="text-texto-2">
          <Trans>Código de verificação</Trans>
        </dt>
        <dd className="font-mono text-subtitulo">{codigo}</dd>
        <dd>
          <Button
            tamanho="compacto"
            variante="discreto"
            aria-label={t`Copiar o código de verificação`}
            onClick={() => copiar(codigo, t`Código copiado.`)}
          >
            <Copy aria-hidden className="size-4 stroke-[1.5]" />
          </Button>
        </dd>
      </dl>
      <Button asChild variante="primario" className="w-fit">
        <a href={d.pdfUrl} download>
          <Download aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Descarregar PDF</Trans>
        </a>
      </Button>
    </div>
  )
}

function DialogoAnular({
  estudanteId,
  documento,
  aoFechar,
}: {
  estudanteId: string
  documento: DocumentoOficial | undefined
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const anular = useAnularDocumento(estudanteId)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string>()
  const titulo = documento?.titulo ?? ''
  const numero = documento?.numero ?? ''

  function fechar() {
    setMotivo('')
    setErro(undefined)
    aoFechar()
  }

  function confirmar() {
    if (!documento) return
    if (motivo.trim().length < 10)
      return setErro(t`Explique porque anula (pelo menos 10 caracteres).`)
    anular.mutate(
      { id: documento.id, motivo: motivo.trim() },
      {
        onSuccess: () => {
          notificar.sucesso(t`Documento ${numero} anulado.`)
          fechar()
        },
        onError: (e) => setErro((eApiError(e) && e.errors[0]?.mensagem) || mensagemDeErro(e)),
      },
    )
  }

  return (
    <Dialogo
      aberta={Boolean(documento)}
      aoMudar={(v) => !v && fechar()}
      pendente={anular.isPending}
      titulo={t`Anular ${titulo} ${numero}`}
      descricao={t`O documento deixa de ser válido na verificação. Continua no histórico, riscado e com o motivo.`}
      rodape={
        <>
          <Button onClick={fechar} disabled={anular.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button variante="destrutivo" aCarregar={anular.isPending} onClick={confirmar}>
            <Trans>Anular</Trans>
          </Button>
        </>
      }
    >
      <Campo rotulo={t`Motivo`} erro={erro} obrigatorio>
        {(c) => (
          <AreaTexto
            {...c}
            rows={3}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value)
              setErro(undefined)
            }}
          />
        )}
      </Campo>
    </Dialogo>
  )
}
