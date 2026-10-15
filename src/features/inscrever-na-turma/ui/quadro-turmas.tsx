import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { GripVertical, MoreHorizontal } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { BarraOcupacao, type Inscrito, type Turma } from '@/entities/turma'
import { cn } from '@/shared/lib/cn'
import { CURVA_PADRAO } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import {
  AreaTexto,
  Avatar,
  Button,
  Campo,
  Dialogo,
  Entrada,
  EstadoVazio,
  Esqueleto,
  EtiquetaEstado,
  notificar,
} from '@/shared/ui'
import { lotacao, quadroQuery, SEM_TURMA, type Quadro } from '../model/quadro'
import { useColocarNaTurma, type Colocacao } from '../model/use-colocar-na-turma'

interface Props {
  anoLectivoId: string
  classeId: string
  soLeitura: boolean
}

type Pedido = { tipo: 'motivo' | 'excepcao'; colocacao: Colocacao }

/**
 * Quadro da turma (guia 6.3): colunas por turma com barra de ocupação; cartões arrastáveis
 * com rato, toque e teclado; "Mover para…" como alternativa de menu; destino cheio desactivado
 * com explicação; Desfazer disponível.
 */
export function QuadroTurmas({ anoLectivoId, classeId, soLeitura }: Props) {
  const { t } = useLingui()
  const podeEscrever = useCan('turmas:escrever') && !soLeitura
  const podeExcepcao = useCan('inscricoes:excepcao')
  const { data: quadro } = useQuery(quadroQuery(anoLectivoId, classeId))
  const [arrastado, setArrastado] = useState<Inscrito | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const colocar = useColocarNaTurma(anoLectivoId, classeId, (c) =>
    podeExcepcao ? setPedido({ tipo: 'excepcao', colocacao: c }) : undefined,
  )

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  if (!quadro) return <Esqueleto className="h-[28rem] w-full" />
  if (!quadro.turmas.length) {
    return (
      <EstadoVazio
        titulo={t`Esta classe ainda não tem turmas neste ano.`}
        descricao={t`Crie as turmas antes de distribuir os estudantes.`}
      />
    )
  }

  const colunas = [SEM_TURMA, ...quadro.turmas.map((x) => x.id)]
  const nomeColuna = (id: string) =>
    id === SEM_TURMA ? t`Sem turma` : (quadro.turmas.find((x) => x.id === id)?.designacao ?? id)

  /** Ponto único de decisão para arrastar e para o menu "Mover para…". */
  function pedirColocacao(cartao: Inscrito, origem: string, destino: string) {
    if (origem === destino) return
    const colocacao: Colocacao = { cartao, origem, destino }
    const { cheia, inscritos, turma } = lotacao(quadro!, destino)
    if (destino !== SEM_TURMA && cheia) {
      if (podeExcepcao) return setPedido({ tipo: 'excepcao', colocacao })
      // Nem se tenta: a interface não oferece o que vai ser recusado (guia 2.2)
      const nomeTurma = turma?.designacao ?? ''
      const maximo = turma?.lotacaoMaxima ?? 0
      notificar.erro(
        t`A ${nomeTurma} já está cheia (${inscritos} de ${maximo}). Escolha outra turma.`,
      )
      return
    }
    // Mudar entre turmas pede o motivo num campo curto (guia 2.3)
    if (origem !== SEM_TURMA && destino !== SEM_TURMA)
      return setPedido({ tipo: 'motivo', colocacao })
    colocar.mutate(colocacao)
  }

  function aoLargar({ active, over }: DragEndEvent) {
    setArrastado(null)
    if (!over) return
    const { cartao, origem } = active.data.current as { cartao: Inscrito; origem: string }
    pedirColocacao(cartao, origem, String(over.id))
  }

  // Anúncios para leitores de ecrã em português (o dnd-kit vem em inglês)
  const anuncios: Announcements = {
    onDragStart: ({ active }) => {
      const nome = nomeDe(active)
      return t`A arrastar ${nome}. Use as setas e Espaço para largar.`
    },
    onDragOver: ({ active, over }) => {
      const nome = nomeDe(active)
      const destino = over ? nomeColuna(String(over.id)) : ''
      return over ? t`${nome} sobre ${destino}.` : t`${nome} fora das turmas.`
    },
    onDragEnd: ({ active, over }) => {
      const nome = nomeDe(active)
      const destino = over ? nomeColuna(String(over.id)) : ''
      return over ? t`${nome} largado em ${destino}.` : t`Cancelado.`
    },
    onDragCancel: () => t`Cancelado.`,
  }

  return (
    <DndContext
      sensors={sensores}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable: t`Para arrastar, carregue em Espaço; mova com as setas e largue com Espaço. Esc cancela.`,
        },
      }}
      onDragStart={({ active }: DragStartEvent) =>
        setArrastado((active.data.current as { cartao: Inscrito }).cartao)
      }
      onDragCancel={() => setArrastado(null)}
      onDragEnd={aoLargar}
    >
      <div className="-mx-6 overflow-x-auto px-6 pb-4">
        <div className="flex min-w-max gap-4">
          {colunas.map((id) => (
            <Coluna
              key={id}
              id={id}
              quadro={quadro}
              titulo={nomeColuna(id)}
              turma={quadro.turmas.find((x) => x.id === id)}
              arrastando={Boolean(arrastado)}
              podeExcepcao={podeExcepcao}
            >
              {quadro.colunas[id]?.map((cartao) => (
                <Cartao
                  key={cartao.matriculaId}
                  cartao={cartao}
                  coluna={id}
                  podeEscrever={podeEscrever}
                  destinos={colunas
                    .filter((c) => c !== id)
                    .map((c) => ({ id: c, nome: nomeColuna(c), cheia: lotacao(quadro, c).cheia }))}
                  aoMover={(destino) => pedirColocacao(cartao, id, destino)}
                />
              ))}
            </Coluna>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={ANIMACAO_LARGAR}>
        {arrastado && <CartaoVisual cartao={arrastado} flutuante />}
      </DragOverlay>

      <PedidoDialogo
        pedido={pedido}
        nomeDestino={pedido ? nomeColuna(pedido.colocacao.destino) : ''}
        aoCancelar={() => setPedido(null)}
        aoConfirmar={(texto) => {
          if (!pedido) return
          const c = pedido.colocacao
          colocar.mutate(
            pedido.tipo === 'motivo'
              ? { ...c, motivo: texto }
              : { ...c, excepcao: texto, motivo: c.motivo ?? texto },
          )
          setPedido(null)
        }}
      />
    </DndContext>
  )
}

/** Mola curta ao largar, com a curva padrão dos tokens (guia 6.1) */
const ANIMACAO_LARGAR = { duration: 200, easing: CURVA_PADRAO }
const nomeDe = (active: { data: { current?: unknown } }) =>
  (active.data.current as { cartao?: Inscrito } | undefined)?.cartao?.nome ?? ''

function Coluna({
  id,
  quadro,
  titulo,
  turma,
  arrastando,
  podeExcepcao,
  children,
}: {
  id: string
  quadro: Quadro
  titulo: string
  turma?: Turma
  arrastando: boolean
  podeExcepcao: boolean
  children: ReactNode
}) {
  const { t } = useLingui()
  const { inscritos, cheia } = lotacao(quadro, id)
  // Destino cheio fica desactivado (só quem pode pedir excepção consegue largar lá)
  const { setNodeRef, isOver } = useDroppable({ id, disabled: cheia && !podeExcepcao })
  const quantos = quadro.colunas[id]?.length ?? 0

  return (
    <section
      ref={setNodeRef}
      aria-label={titulo}
      className={cn(
        'flex w-72 flex-col rounded-cartao bg-superficie ring-1 ring-linha transition-shadow duration-(--duracao-micro)',
        id === SEM_TURMA && 'ring-dashed bg-fundo ring-contorno',
        arrastando && !cheia && 'ring-acento/40',
        isOver && 'ring-2 ring-acento',
        arrastando && cheia && 'opacity-60',
      )}
    >
      <header className="flex flex-col gap-2 border-b border-linha p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-subtitulo">{titulo}</h3>
          {turma ? (
            cheia ? (
              <EtiquetaEstado tom="aviso">{t`Cheia`}</EtiquetaEstado>
            ) : (
              <span className="text-legenda text-texto-3">{turma.turnoRotulo}</span>
            )
          ) : (
            <span className="tabular text-legenda text-texto-3">{quantos}</span>
          )}
        </div>
        {turma && (
          <BarraOcupacao
            turma={{
              ...turma,
              inscritos,
              ocupacao: Math.min(1, inscritos / turma.lotacaoMaxima),
              turmaCheia: cheia,
            }}
          />
        )}
        {arrastando && cheia && (
          <p className="text-secundario text-texto-2">
            {podeExcepcao
              ? t`Turma cheia: largar aqui pede uma excepção justificada.`
              : t`Turma cheia: não aceita mais estudantes.`}
          </p>
        )}
      </header>
      <ul className="flex min-h-24 flex-col gap-1.5 p-2">{children}</ul>
    </section>
  )
}

function Cartao({
  cartao,
  coluna,
  podeEscrever,
  destinos,
  aoMover,
}: {
  cartao: Inscrito
  coluna: string
  podeEscrever: boolean
  destinos: { id: string; nome: string; cheia: boolean }[]
  aoMover: (destino: string) => void
}) {
  const { t } = useLingui()
  const nome = cartao.nome
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cartao.matriculaId,
    data: { cartao, origem: coluna },
    disabled: !podeEscrever,
  })

  return (
    <li ref={setNodeRef} className={cn('group relative', isDragging && 'opacity-30')}>
      <div className="flex items-center gap-1">
        <div
          {...(podeEscrever ? { ...listeners, ...attributes } : {})}
          aria-roledescription={podeEscrever ? t`cartão arrastável` : undefined}
          aria-label={podeEscrever ? t`Arrastar ${nome}` : undefined}
          className={cn(
            'min-w-0 flex-1 rounded-controlo outline-none focus-visible:ring-2 focus-visible:ring-acento',
            podeEscrever && 'cursor-grab active:cursor-grabbing',
          )}
        >
          <CartaoVisual cartao={cartao} pega={podeEscrever} />
        </div>
        {podeEscrever && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label={t`Mover ${nome} para…`}
              className="rounded-controlo p-1 text-texto-3 opacity-0 group-hover:opacity-100 hover:bg-fundo hover:text-texto-1 focus-visible:opacity-100 data-[state=open]:opacity-100 [&_svg]:size-4"
            >
              <MoreHorizontal aria-hidden />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-48 rounded-cartao bg-superficie p-1 shadow-flutuante ring-1 ring-linha"
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-legenda text-texto-3">{t`Mover para…`}</DropdownMenu.Label>
                {destinos.map((d) => (
                  <DropdownMenu.Item
                    key={d.id}
                    onSelect={() => aoMover(d.id)}
                    className="flex cursor-default items-center justify-between gap-3 rounded-controlo px-2 py-1.5 text-corpo outline-none data-highlighted:bg-fundo"
                  >
                    {d.nome}
                    {d.cheia && <span className="text-legenda text-aviso">{t`cheia`}</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </li>
  )
}

function CartaoVisual({
  cartao,
  flutuante,
  pega,
}: {
  cartao: Inscrito
  flutuante?: boolean
  pega?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-controlo bg-superficie px-2 py-1.5 ring-1 ring-linha',
        flutuante && 'shadow-flutuante ring-acento',
      )}
    >
      {pega && <GripVertical aria-hidden className="size-3.5 shrink-0 stroke-[1.5] text-texto-3" />}
      <Avatar nome={cartao.nome} fotografia={cartao.fotografiaUrl} tamanho="pequeno" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-corpo">{cartao.nome}</span>
        <span className="tabular text-legenda text-texto-3">{cartao.numeroProcesso}</span>
      </span>
    </div>
  )
}

function PedidoDialogo({
  pedido,
  nomeDestino,
  aoCancelar,
  aoConfirmar,
}: {
  pedido: Pedido | null
  nomeDestino: string
  aoCancelar: () => void
  aoConfirmar: (texto: string) => void
}) {
  const { t } = useLingui()
  const [texto, setTexto] = useState('')
  const nome = pedido?.colocacao.cartao.nome ?? ''
  const excepcao = pedido?.tipo === 'excepcao'
  const valido = texto.trim().length >= (excepcao ? 10 : 3)

  return (
    <Dialogo
      aberta={Boolean(pedido)}
      aoMudar={(aberta) => {
        if (!aberta) {
          setTexto('')
          aoCancelar()
        }
      }}
      titulo={excepcao ? t`Pedir excepção de lotação` : t`Mudar ${nome} para ${nomeDestino}`}
      descricao={
        excepcao
          ? t`A ${nomeDestino} está cheia. Uma excepção fica registada com a justificação.`
          : t`O motivo fica no percurso do estudante.`
      }
      rodape={
        <>
          <Button
            onClick={() => {
              setTexto('')
              aoCancelar()
            }}
          >
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante="primario"
            disabled={!valido}
            onClick={() => {
              aoConfirmar(texto.trim())
              setTexto('')
            }}
          >
            {excepcao ? <Trans>Pedir excepção</Trans> : <Trans>Mudar de turma</Trans>}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valido) {
            aoConfirmar(texto.trim())
            setTexto('')
          }
        }}
      >
        <Campo rotulo={excepcao ? t`Justificação` : t`Motivo`} obrigatorio>
          {(c) =>
            excepcao ? (
              <AreaTexto {...c} value={texto} onChange={(e) => setTexto(e.target.value)} />
            ) : (
              <Entrada
                {...c}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={t`Ex.: pedido do encarregado`}
              />
            )
          }
        </Campo>
      </form>
    </Dialogo>
  )
}
