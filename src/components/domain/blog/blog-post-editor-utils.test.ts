import { describe, expect, it } from 'vitest'

import {
  buildImageMarkdown,
  escapeImageAlt,
  insertAtOffset,
  replaceRange,
} from './blog-post-editor-utils'

describe('escapeImageAlt', () => {
  it('escapes backslashes and square brackets', () => {
    expect(escapeImageAlt(String.raw`a \ [b] c`)).toBe(String.raw`a \\ \[b\] c`)
  })
})

describe('buildImageMarkdown', () => {
  it('wraps alt and url in markdown image syntax', () => {
    expect(buildImageMarkdown('cat', 'https://x/y.png')).toBe(
      '![cat](https://x/y.png)',
    )
  })

  it('escapes brackets in the alt text so it cannot break the syntax', () => {
    expect(buildImageMarkdown('a [b] c', 'https://x/y.png')).toBe(
      '![a \\[b\\] c](https://x/y.png)',
    )
  })
})

describe('insertAtOffset', () => {
  it('inserts a snippet at the given offset and returns the caret end', () => {
    expect(insertAtOffset('abc', 1, 'X')).toEqual({ text: 'aXbc', caret: 2 })
  })

  it('clamps an offset beyond the text length', () => {
    expect(insertAtOffset('abc', 99, 'X')).toEqual({ text: 'abcX', caret: 4 })
  })

  it('clamps a negative offset to the start', () => {
    expect(insertAtOffset('abc', -1, 'X')).toEqual({ text: 'Xabc', caret: 1 })
  })
})

describe('replaceRange', () => {
  it('replaces a range and returns the caret end', () => {
    expect(replaceRange('abcdef', 2, 5, 'X')).toEqual({
      text: 'abXf',
      caret: 3,
    })
  })

  it('clamps start and end outside the text length', () => {
    expect(replaceRange('abc', -10, 99, 'X')).toEqual({
      text: 'X',
      caret: 1,
    })
  })

  it('clamps end before start to an empty range', () => {
    expect(replaceRange('abc', 2, 1, 'X')).toEqual({
      text: 'abXc',
      caret: 3,
    })
  })
})
