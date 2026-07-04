import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('markdown styles', () => {
  it('allows block math to scroll horizontally inside markdown content', () => {
    const styles = readFileSync('src/styles.css', 'utf8')

    expect(styles).toContain('.markdown-body .katex-display')
    expect(styles).toContain('overflow-x: auto')
    expect(styles).toContain('overflow-y: hidden')
  })
})
