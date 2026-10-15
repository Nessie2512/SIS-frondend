import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mostrarAtalho, useAtalhos, type Atalho } from './atalhos'

function Teste({ atalhos }: { atalhos: Atalho[] }) {
  useAtalhos(atalhos)
  return <input aria-label="campo" />
}

describe('useAtalhos', () => {
  it('teclas simples não actuam enquanto se escreve', () => {
    const novo = vi.fn()
    const { getByLabelText } = render(<Teste atalhos={[{ teclas: 'n', accao: novo }]} />)
    fireEvent.keyDown(getByLabelText('campo'), { key: 'n' })
    expect(novo).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'n' })
    expect(novo).toHaveBeenCalledOnce()
  })

  it('combinações com Ctrl actuam mesmo dentro de campos, excepto as marcadas', () => {
    const paleta = vi.fn()
    const desfazer = vi.fn()
    const { getByLabelText } = render(
      <Teste
        atalhos={[
          { teclas: 'mod+k', accao: paleta },
          { teclas: 'mod+z', accao: desfazer, foraDeCampos: true },
        ]}
      />,
    )
    fireEvent.keyDown(getByLabelText('campo'), { key: 'k', ctrlKey: true })
    fireEvent.keyDown(getByLabelText('campo'), { key: 'z', ctrlKey: true })
    expect(paleta).toHaveBeenCalledOnce()
    expect(desfazer).not.toHaveBeenCalled()
  })

  it('reconhece sequências como "g t"', () => {
    const irTurmas = vi.fn()
    render(<Teste atalhos={[{ teclas: 'g t', accao: irTurmas }]} />)
    fireEvent.keyDown(window, { key: 'g' })
    fireEvent.keyDown(window, { key: 't' })
    expect(irTurmas).toHaveBeenCalledOnce()
  })

  it('mostra Ctrl+ fora do Mac', () => {
    expect(mostrarAtalho('mod+k')).toBe('Ctrl+K')
  })
})
