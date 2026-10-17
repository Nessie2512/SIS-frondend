import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { meQuery, sair } from '@/entities/utilizador'
import { usePreferencias, type Densidade, type PreferenciaTema } from '@/shared/lib/preferencias'
import { Avatar, Button, ControloSegmentado, ErroDeRota } from '@/shared/ui'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/_app/definicoes/')({
  errorComponent: ErroDeRota,
  component: Definicoes,
})

/** Preferências (guia 6.1): apresentação neste navegador e a conta. */
function Definicoes() {
  const { t } = useLingui()
  const { tema, densidade, menuRecolhido, definirTema, definirDensidade, definirMenuRecolhido } =
    usePreferencias()
  const { data: eu } = useQuery(meQuery())

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <p className="text-secundario text-texto-2">
        <Trans>As preferências de apresentação ficam guardadas neste navegador.</Trans>
      </p>

      <Grupo titulo={t`Apresentação`}>
        <Linha
          rotulo={t`Tema`}
          descricao={t`«Igual ao sistema» segue o modo claro ou escuro do computador.`}
        >
          <ControloSegmentado
            rotulo={t`Tema`}
            valor={tema}
            aoMudar={(v) => definirTema(v as PreferenciaTema)}
            opcoes={[
              { valor: 'sistema', rotulo: t`Igual ao sistema` },
              { valor: 'claro', rotulo: t`Claro` },
              { valor: 'escuro', rotulo: t`Escuro` },
            ]}
          />
        </Linha>
        <Linha
          rotulo={t`Densidade`}
          descricao={t`Compacta mostra mais linhas por ecrã nas listas.`}
        >
          <ControloSegmentado
            rotulo={t`Densidade`}
            valor={densidade}
            aoMudar={(v) => definirDensidade(v as Densidade)}
            opcoes={[
              { valor: 'confortavel', rotulo: t`Confortável` },
              { valor: 'compacta', rotulo: t`Compacta` },
            ]}
          />
        </Linha>
        <Linha
          rotulo={t`Menu lateral`}
          descricao={t`Recolhido mostra só os ícones; o nome aparece ao passar o rato ou com o teclado.`}
        >
          <ControloSegmentado
            rotulo={t`Menu lateral`}
            valor={menuRecolhido ? 'recolhido' : 'expandido'}
            aoMudar={(v) => definirMenuRecolhido(v === 'recolhido')}
            opcoes={[
              { valor: 'expandido', rotulo: t`Expandido` },
              { valor: 'recolhido', rotulo: t`Recolhido` },
            ]}
          />
        </Linha>
      </Grupo>

      {eu && (
        <Grupo titulo={t`Conta`}>
          <div className="flex flex-wrap items-center gap-4 py-4">
            <Avatar nome={eu.nome} tamanho="grande" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{eu.nome}</span>
              <span className="text-secundario text-texto-2">{eu.email}</span>
            </div>
            <Button onClick={() => void sair()}>
              <LogOut aria-hidden className="size-4 stroke-[1.5]" />
              <Trans>Terminar sessão</Trans>
            </Button>
          </div>
        </Grupo>
      )}
    </section>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col">
      <h2 className="mb-2 text-titulo-seccao">{titulo}</h2>
      <div className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie px-4 ring-1 ring-linha">
        {children}
      </div>
    </section>
  )
}

function Linha({
  rotulo,
  descricao,
  children,
}: {
  rotulo: string
  descricao: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-56 flex-1 flex-col gap-0.5">
        <span className="font-medium">{rotulo}</span>
        <span className="text-secundario text-texto-2">{descricao}</span>
      </div>
      {children}
    </div>
  )
}
