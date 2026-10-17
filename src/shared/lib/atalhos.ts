import { useEffect } from 'react'

/**
 * Atalhos de teclado (guia 7.5). As teclas simples (/, N, E, G, ?) não actuam enquanto se
 * escreve num campo; as combinações com ⌘/Ctrl actuam sempre.
 */
export type Atalho = {
  /** Ex.: 'mod+k', '/', 'n', 'g t', '?', 'mod+enter', 'mod+z' */
  teclas: string
  accao: (evento: KeyboardEvent) => void
  /** Não actuar dentro de campos (ex.: ⌘Z, para não roubar o desfazer nativo do texto) */
  foraDeCampos?: boolean
}

export const eMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Texto para mostrar o atalho ao utilizador: ⌘K no Mac, Ctrl+K no resto. */
export function mostrarAtalho(teclas: string): string {
  return teclas
    .split(' ')
    .map((parte) =>
      parte
        .split('+')
        .map((t) =>
          t === 'mod' ? (eMac() ? '⌘' : 'Ctrl+') : t === 'enter' ? 'Enter' : t.toUpperCase(),
        )
        .join(''),
    )
    .join(' ')
}

function aEscrever(alvo: EventTarget | null) {
  if (!(alvo instanceof HTMLElement)) return false
  const el = alvo
  return (
    el.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
    el.getAttribute('role') === 'combobox'
  )
}

function corresponde(e: KeyboardEvent, combinacao: string) {
  const partes = combinacao.split('+')
  const tecla = partes.at(-1)!
  const mod = partes.includes('mod')
  const shift = partes.includes('shift')
  if (mod !== (eMac() ? e.metaKey : e.ctrlKey)) return false
  if (!['?', '/'].includes(tecla) && shift !== e.shiftKey) return false
  if (e.altKey) return false
  return e.key.toLowerCase() === tecla
}

/** Regista atalhos globais; sequências como 'g t' aceitam 1 s entre teclas. */
export function useAtalhos(atalhos: Atalho[]) {
  useEffect(() => {
    let prefixo: string | null = null
    let limpar: ReturnType<typeof setTimeout> | undefined

    function aoTeclar(e: KeyboardEvent) {
      if (e.defaultPrevented) return
      const escrevendo = aEscrever(e.target)
      for (const atalho of atalhos) {
        const passos = atalho.teclas.split(' ')
        const comMod = atalho.teclas.includes('mod+')
        if (escrevendo && (!comMod || atalho.foraDeCampos)) continue
        if (passos.length === 2) {
          if (prefixo === passos[0] && corresponde(e, passos[1]!)) {
            e.preventDefault()
            prefixo = null
            atalho.accao(e)
            return
          }
        } else if (corresponde(e, passos[0]!)) {
          e.preventDefault()
          atalho.accao(e)
          return
        }
      }
      // Guarda o primeiro passo de uma sequência
      if (
        !escrevendo &&
        atalhos.some(
          (a) => a.teclas.split(' ').length === 2 && a.teclas.startsWith(`${e.key.toLowerCase()} `),
        )
      ) {
        prefixo = e.key.toLowerCase()
        clearTimeout(limpar)
        limpar = setTimeout(() => (prefixo = null), 1000)
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      clearTimeout(limpar)
    }
  }, [atalhos])
}

/** Executa a acção do elemento marcado com data-atalho no ecrã actual (ex.: botão "Nova turma"). */
export function accionarMarcado(nome: 'novo' | 'editar' | 'pesquisa') {
  // E edita o item em foco (guia 7.5): primeiro o item que contém o foco, depois o do ecrã
  const emFoco =
    nome === 'editar'
      ? document.activeElement
          ?.closest('[data-editavel]')
          ?.querySelector<HTMLElement>('[data-accao="editar"]')
      : null
  const el = emFoco ?? document.querySelector<HTMLElement>(`[data-atalho="${nome}"]`)
  if (!el) return false
  if (nome === 'pesquisa') el.focus()
  else el.click()
  return true
}
