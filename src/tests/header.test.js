import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8')

describe('header shell', () => {
  it('uses one icon-only text-size trigger and no legacy AI or A controls', () => {
    expect(mainSource).not.toContain('>AI<')
    expect(mainSource).not.toContain('>A−<')
    expect(mainSource).not.toContain('>A+<')
    expect(mainSource).toContain('id="text-size-menu-button"')
    expect(mainSource).toContain('data-text-size-option')
  })

  it('keeps one globe icon in the language control', () => {
    expect(mainSource.match(/iconSvg\('globe'\)/g)).toHaveLength(1)
    expect(mainSource).toContain('<label class="language-selector">${iconSvg(\'globe\')}')
  })

  it('gives desktop tabs equal-width, single-line layout rules', () => {
    expect(styleSource).toMatch(/\.nav-link[^}]*flex:\s*1\s+1\s+0/)
    expect(styleSource).toMatch(/\.nav-link[^}]*white-space:\s*nowrap/)
    expect(styleSource).toMatch(/\.nav-link[^}]*min-width:\s*108px/)
    expect([...mainSource.matchAll(/\['[^']+','[^']+'\]/g)]).toHaveLength(7)
  })
})
