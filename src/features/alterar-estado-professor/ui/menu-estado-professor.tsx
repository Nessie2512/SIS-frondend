import { Trans, useLingui } from '@lingui/react/macro'
import { Check, ChevronDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import {
  rotuloEstadoProfessor,
  type EstadoProfessor,
  type ProfessorResumo,
} from '@/entities/professor'
import { anunciar } from '@/shared/lib/anunciar'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Button, notificar, notificarComDesfazer } from '@/shared/ui'
import { useAlterarEstadoProfessor } from '../model/use-alterar-estado'

const ORDEM: EstadoProfessor[] = ['ACTIVO', 'LICENCA', 'SUSPENSO', 'DESLIGADO']

/**
 * Mudar o estado do professor (guia 2.2, 5.2): muda já, com Desfazer durante 8 s.
 * Cada opção diz o efeito concreto em vez de pedir confirmação.
 */
export function MenuEstadoProfessor({
  professor,
  anoLectivoId,
}: {
  professor: Pick<ProfessorResumo, 'id' | 'nome' | 'estado'>
  anoLectivoId: string
}) {
  const { t } = useLingui()
  const alterar = useAlterarEstadoProfessor(anoLectivoId)

  const EFEITO: Record<EstadoProfessor, string> = {
    ACTIVO: t`Pode receber novas atribuições.`,
    LICENCA: t`Ausência temporária. Mantém as atribuições, mas não recebe novas.`,
    SUSPENSO: t`Não recebe novas atribuições até ser reactivado.`,
    DESLIGADO: t`Deixou a escola. O histórico mantém-se.`,
  }

  function mudar(estado: EstadoProfessor) {
    const anterior = professor.estado
    if (estado === anterior) return
    const nome = professor.nome
    const rotulo = rotuloEstadoProfessor(estado)
    alterar.mutate(
      { professorId: professor.id, estado },
      {
        onError: (erro) => notificar.erro(mensagemDeErro(erro)),
      },
    )
    anunciar.educado(t`${nome}: ${rotulo}.`)
    notificarComDesfazer(t`${nome} passou a «${rotulo}».`, () =>
      alterar.mutate(
        { professorId: professor.id, estado: anterior },
        { onError: (erro) => notificar.erro(mensagemDeErro(erro)) },
      ),
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button>
          <Trans>Alterar estado</Trans>
          <ChevronDown aria-hidden className="size-4 stroke-[1.5]" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-72 rounded-cartao bg-superficie p-1 shadow-flutuante ring-1 ring-linha data-[state=open]:animate-desvanecer-entrar"
        >
          <DropdownMenu.RadioGroup
            value={professor.estado}
            onValueChange={(v) => mudar(v as EstadoProfessor)}
          >
            {ORDEM.map((estado) => (
              <DropdownMenu.RadioItem
                key={estado}
                value={estado}
                className="flex cursor-default gap-2 rounded-controlo px-2 py-2 outline-none data-highlighted:bg-fundo"
              >
                <span className="mt-0.5 size-4 shrink-0">
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-4 stroke-[1.5] text-acento" />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span className="flex flex-col">
                  <span className="text-corpo">{rotuloEstadoProfessor(estado)}</span>
                  <span className="text-secundario text-texto-3">{EFEITO[estado]}</span>
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
