import { useLingui } from '@lingui/react/macro'
import { useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { create } from 'zustand'
import { accionarMarcado, useAtalhos, type Atalho } from '@/shared/lib/atalhos'
import { useComLigacao } from '@/shared/lib/ligacao'
import { Aviso, desfazerUltima, RegiaoAnuncios } from '@/shared/ui'
import { AjudaAtalhos } from './ajuda-atalhos'
import { PaletaComandos } from './paleta-comandos'

/**
 * Peças globais da casca: paleta ⌘K, atalhos, ajuda de atalhos, regiões aria-live
 * e a faixa "sem ligação" (guia 5.8, 7.5, 8.1).
 */
const usePaleta = create<{ aberta: boolean }>()(() => ({ aberta: false }))
const setPaleta = (v: boolean | ((anterior: boolean) => boolean)) =>
  usePaleta.setState((e) => ({ aberta: typeof v === 'function' ? v(e.aberta) : v }))

/** Abre a paleta de comandos a partir de qualquer botão. */
export const abrirPaleta = () => setPaleta(true)

export function Casca() {
  const router = useRouter()
  const paleta = usePaleta((e) => e.aberta)
  const [ajuda, setAjuda] = useState(false)

  const atalhos = useMemo<Atalho[]>(
    () => [
      { teclas: 'mod+k', accao: () => setPaleta((v) => !v) },
      { teclas: '/', accao: () => accionarMarcado('pesquisa') },
      { teclas: 'n', accao: () => accionarMarcado('novo') },
      { teclas: 'e', accao: () => accionarMarcado('editar') },
      { teclas: 'mod+z', accao: () => desfazerUltima(), foraDeCampos: true },
      {
        teclas: 'mod+enter',
        accao: (e) => (e.target as HTMLElement | null)?.closest('form')?.requestSubmit(),
      },
      { teclas: 'g i', accao: () => void router.navigate({ to: '/' }) },
      { teclas: 'g t', accao: () => void router.navigate({ to: '/turmas' }) },
      { teclas: 'shift+?', accao: () => setAjuda(true) },
    ],
    [router],
  )
  useAtalhos(atalhos)

  return (
    <>
      <PaletaComandos aberta={paleta} aoMudar={setPaleta} aoMostrarAtalhos={() => setAjuda(true)} />
      <AjudaAtalhos aberta={ajuda} aoMudar={setAjuda} />
      <RegiaoAnuncios />
    </>
  )
}

/** Faixa discreta quando não há ligação; as escritas ficam em pausa e retomam (guia 5.8). */
export function FaixaSemLigacao() {
  const { t } = useLingui()
  const comLigacao = useComLigacao()
  if (comLigacao) return null
  return (
    <Aviso tom="aviso" forma="faixa">
      {t`Sem ligação. Pode continuar a consultar; as alterações são enviadas quando a ligação voltar.`}
    </Aviso>
  )
}
