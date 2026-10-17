import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { perfisQuery } from '@/entities/administracao'
import { ErroDeRota, Esqueleto } from '@/shared/ui'

export const Route = createFileRoute('/_app/definicoes/perfis')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(perfisQuery()),
  errorComponent: ErroDeRota,
  component: EcraPerfis,
})

/** Rótulos das permissões, agrupadas por área (o que cada perfil pode fazer, em linguagem simples). */
function usePermissoes() {
  const { t } = useLingui()
  return {
    areas: [
      { area: t`Estudantes`, ler: 'estudantes:ler', escrever: 'estudantes:escrever' },
      { area: t`Matrículas`, ler: 'matriculas:ler', escrever: 'matriculas:escrever' },
      { area: t`Turmas`, ler: 'turmas:ler', escrever: 'turmas:escrever' },
      { area: t`Professores`, ler: 'professores:ler', escrever: 'professores:escrever' },
      { area: t`Currículo`, ler: 'curriculo:ler', escrever: 'curriculo:escrever' },
      { area: t`Calendário`, ler: 'calendario:ler', escrever: 'calendario:escrever' },
      { area: t`Administração`, ler: 'administracao:ler', escrever: 'administracao:escrever' },
    ],
    extra: [
      { chave: 'documentos:emitir', rotulo: t`Emitir documentos oficiais` },
      { chave: 'inscricoes:excepcao', rotulo: t`Inscrever acima da lotação` },
      { chave: 'anos:gerir', rotulo: t`Abrir, activar e encerrar anos lectivos` },
    ],
  }
}

/** Perfis de acesso (guia 2.5, 2.7): o que cada perfil permite e quantas pessoas o têm. */
function EcraPerfis() {
  const { t } = useLingui()
  const { data: perfis } = useQuery(perfisQuery())
  const { areas, extra } = usePermissoes()
  if (!perfis) return <Esqueleto className="h-64 w-full" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-titulo-seccao">
          <Trans>Perfis de acesso</Trans>
        </h2>
        <p className="text-secundario text-texto-2">
          <Trans>
            Cada utilizador tem um perfil. Os perfis são definidos pela escola e mudam-se no
            servidor.
          </Trans>
        </p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {perfis.map((p) => {
          const n = p.utilizadores
          const nome = p.nome
          const temPerm = (k: string) => p.permissoes.includes(k)
          return (
            <li key={p.id}>
              <article
                aria-labelledby={`perfil-${p.id}`}
                className="flex h-full flex-col gap-3 rounded-cartao bg-superficie p-4 ring-1 ring-linha"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 id={`perfil-${p.id}`} className="text-subtitulo">
                      {nome}
                    </h3>
                    <p className="text-secundario text-texto-2">{p.descricao}</p>
                  </div>
                  <Link
                    to="/definicoes/utilizadores"
                    search={{ perfilId: p.id }}
                    aria-label={t`Ver os utilizadores com o perfil ${nome}`}
                    className="tabular shrink-0 text-secundario whitespace-nowrap text-acento hover:underline"
                  >
                    {plural(n, { one: '# utilizador', other: '# utilizadores' })}
                  </Link>
                </div>
                <table className="w-full text-left text-secundario">
                  <caption className="sr-only">{t`Permissões do perfil ${nome}`}</caption>
                  <thead className="text-legenda text-texto-3">
                    <tr>
                      <th scope="col" className="py-1 font-medium">
                        <Trans>Área</Trans>
                      </th>
                      <th scope="col" className="py-1 font-medium">
                        <Trans>Acesso</Trans>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.map((a) => (
                      <tr key={a.area} className="border-t border-linha">
                        <th scope="row" className="py-1.5 font-normal">
                          {a.area}
                        </th>
                        <td className="py-1.5 text-texto-2">
                          {temPerm(a.escrever)
                            ? t`Consultar e alterar`
                            : temPerm(a.ler)
                              ? t`Só consultar`
                              : t`Sem acesso`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {extra.some((e) => temPerm(e.chave)) && (
                  <p className="text-secundario text-texto-2">
                    <Trans>Também pode:</Trans>{' '}
                    {extra
                      .filter((e) => temPerm(e.chave))
                      .map((e) => e.rotulo.toLowerCase())
                      .join('; ')}
                    .
                  </p>
                )}
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
