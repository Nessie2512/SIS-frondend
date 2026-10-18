// O código dentro de page.evaluate corre no browser: precisa dos tipos do DOM
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * Alvos de toque e clique (guia 8.1): mínimo de 32 px em computador e 44 px em toque. Mede os
 * controlos visíveis; uma caixa de selecção ou opção dentro de uma etiqueta conta com a
 * etiqueta (é ela o alvo). Ficam de fora as ligações dentro de texto corrido (excepção
 * «inline» da WCAG 2.5.8), que seguem o tamanho da linha.
 */
export async function alvosPequenos(page: Page, minimo: number): Promise<string[]> {
  return page.evaluate((min) => {
    const seletor = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="combobox"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="switch"]',
    ].join(',')
    const visivel = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const emTexto = (el: Element) => {
      if (el.tagName !== 'A') return false
      const pai = el.parentElement
      if (!pai) return false
      // Ligação no meio de uma frase: o pai tem texto próprio além da ligação
      return [...pai.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 1,
      )
    }
    const problemas: string[] = []
    for (const el of document.querySelectorAll(seletor)) {
      if (el.closest('[aria-hidden="true"], [inert], .sr-only')) continue
      const alvo =
        el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label')
          ? el.closest('label')!
          : el
      if (!visivel(alvo) || emTexto(el)) continue
      const r = alvo.getBoundingClientRect()
      if (Math.round(r.height) < min || Math.round(r.width) < min) {
        const nome =
          el.getAttribute('aria-label') ||
          (el.textContent ?? '').trim().slice(0, 40) ||
          el.getAttribute('name') ||
          el.tagName.toLowerCase()
        problemas.push(`${nome} (${Math.round(r.width)}×${Math.round(r.height)})`)
      }
    }
    return [...new Set(problemas)]
  }, minimo)
}
