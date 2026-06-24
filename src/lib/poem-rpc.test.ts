import { describe, expect, it } from 'vitest'

import { createPoemFromData, validateCreatePoemInput } from './poem-rpc'

const ownerViewer = { role: 'owner' }
const reviewerViewer = { role: 'reviewer' }

function fakeD1(behaviour: {
  insertThrow?: unknown
  selectResult?: Record<string, unknown> | null
}) {
  return {
    prepare() {
      return {
        async run() {
          if (behaviour.insertThrow) throw behaviour.insertThrow
          return { success: true }
        },
        async first() {
          return behaviour.selectResult ?? null
        },
        bind(..._args: unknown[]) {
          return this
        },
      }
    },
  } as unknown as D1Database
}

describe('validateCreatePoemInput', () => {
  it('trims and accepts valid title and content', () => {
    expect(
      validateCreatePoemInput({ title: '  秋风  ', content: ' 风起 ' }),
    ).toEqual({ title: '秋风', content: '风起' })
  })

  it('rejects empty title', () => {
    expect(() =>
      validateCreatePoemInput({ title: '   ', content: 'content' }),
    ).toThrow('请填写诗名')
  })

  it('rejects titles longer than 80 chars', () => {
    expect(() =>
      validateCreatePoemInput({ title: 'a'.repeat(81), content: 'content' }),
    ).toThrow('80')
  })

  it('rejects empty content', () => {
    expect(() =>
      validateCreatePoemInput({ title: 'title', content: '   ' }),
    ).toThrow('请填写正文')
  })

  it('rejects content longer than 100 000 chars', () => {
    expect(() =>
      validateCreatePoemInput({
        title: 'title',
        content: 'a'.repeat(100_001),
      }),
    ).toThrow('正文过长')
  })

  it('rejects non-object input', () => {
    expect(() => validateCreatePoemInput(null)).toThrow('请填写诗的信息')
  })
})

describe('createPoemFromData', () => {
  it('rejects anonymous viewers', async () => {
    await expect(
      createPoemFromData(
        { title: '秋风', content: '风起' },
        { viewer: null, db: fakeD1({}) },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects reviewers', async () => {
    await expect(
      createPoemFromData(
        { title: '秋风', content: '风起' },
        { viewer: reviewerViewer, db: fakeD1({}) },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('creates a poem for the owner and returns the id', async () => {
    const result = await createPoemFromData(
      { title: '秋风', content: '风起' },
      {
        viewer: ownerViewer,
        db: fakeD1({ selectResult: { id: 42 } }),
      },
    )
    expect(result.id).toBe(42)
  })

  it('throws when the inserted row cannot be found', async () => {
    await expect(
      createPoemFromData(
        { title: '秋风', content: '风起' },
        { viewer: ownerViewer, db: fakeD1({ selectResult: null }) },
      ),
    ).rejects.toThrow('创建诗失败')
  })
})
