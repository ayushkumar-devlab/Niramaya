import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8')

describe('header shell', () => {
  it('does not render a text-size button in the header', () => {
    expect(mainSource).not.toContain('>AI<')
    expect(mainSource).not.toContain('>A−<')
    expect(mainSource).not.toContain('>A+<')
    expect(mainSource).not.toContain('text-size-menu-button')
    expect(mainSource).not.toContain('text-size-menu')
  })

  it('renders a plain accessible language select without a globe icon', () => {
    expect(mainSource).not.toContain('iconSvg(\'globe\')')
    expect(mainSource).toContain('aria-label="${t(\'a11y.languageSelector\')}"')
    expect(mainSource).toContain('<option value="en" lang="en">English</option>')
    expect(mainSource).toContain('<option value="hi" lang="hi">हिन्दी</option>')
    expect(mainSource).toContain('<option value="kn" lang="kn">ಕನ್ನಡ</option>')
  })

  it('gives desktop tabs equal-width, single-line layout rules', () => {
    expect(styleSource).toMatch(/\.nav-link[^}]*flex:\s*1\s+1\s+0/)
    expect(styleSource).toMatch(/\.nav-link[^}]*white-space:\s*nowrap/)
    expect(styleSource).toMatch(/\.nav-link[^}]*min-width:\s*108px/)
    expect(mainSource).toContain('Object.entries(ROUTES)')
  })
})
