import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'
import { renderMarkdown } from '../tools/markdown-preview/render'

function parse(html: string): HTMLElement {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

describe('renderMarkdown', () => {
  it('renders the GFM features the tool promises', () => {
    const doc = parse(renderMarkdown(
      '| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~gone~~',
    ))
    expect(doc.querySelector('table td')?.textContent).toBe('1')
    const boxes = doc.querySelectorAll<HTMLInputElement>('input[type=checkbox]')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]?.checked).toBe(true)
    expect(boxes[1]?.checked).toBe(false)
    expect(doc.querySelector('del')?.textContent).toBe('gone')
  })

  it('removes script vectors', () => {
    const doc = parse(renderMarkdown('[x](javascript:alert(1))\n\n<img src=x onerror=alert(1)>'))
    expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false)
    expect(doc.querySelector('img')?.hasAttribute('onerror')).toBe(false)
  })

  it('opens links in a new tab so the document is not lost', () => {
    const a = parse(renderMarkdown('[x](https://example.com)')).querySelector('a')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('keeps in-page hash links in the same tab', () => {
    const a = parse(renderMarkdown('[x](#section)')).querySelector('a')
    expect(a?.hasAttribute('target')).toBe(false)
  })

  it('does not keep rel="opener" from raw HTML', () => {
    const a = parse(renderMarkdown(
      'text\n\n<a href="https://e.com" target="_blank" rel="opener">o</a>',
    )).querySelector('a')
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('removes <style> so that it cannot restyle the app page', () => {
    const html = renderMarkdown('text\n\n<style>body{display:none}</style>')
    expect(html).not.toContain('<style')
    expect(html).not.toContain('display:none')
  })

  it('removes <form> so that a submit cannot leave the page', () => {
    const doc = parse(renderMarkdown('<form action="https://evil"><input name=q><button>go</button></form>'))
    expect(doc.querySelector('form')).toBeNull()
  })

  it('does not change the shared DOMPurify instance', () => {
    renderMarkdown('[x](https://example.com)')
    expect(DOMPurify.sanitize('<a href="https://e.com">x</a>')).toBe('<a href="https://e.com">x</a>')
  })

  it('escapes code in unknown and known languages', () => {
    expect(renderMarkdown('```weird\n<b>x</b>\n```')).toContain('&lt;b&gt;x&lt;/b&gt;')
    const doc = parse(renderMarkdown('```js\nconst a = "<b>"\n```'))
    expect(doc.querySelector('code')?.className).toContain('language-javascript')
    expect(doc.querySelector('b')).toBeNull()
  })
})
