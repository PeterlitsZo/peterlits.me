import { describe, expect, it } from 'vitest'

import {
  createBlogSeriesFromData,
  normalizeSlug,
  validateCreateBlogSeriesInput,
} from './series-rpc'

const ownerViewer = { role: 'owner' }
const reviewerViewer = { role: 'reviewer' }

function fakeD1(behaviour: {
  insertThrow?: unknown
  selectResult?: Record<string, unknown> | null
}) {
  return {
    prepare() {
      return {
        bind(..._args: unknown[]) {
          return {
            async run() {
              if (behaviour.insertThrow) throw behaviour.insertThrow
              return { success: true }
            },
            async first() {
              return behaviour.selectResult ?? null
            },
          }
        },
      }
    },
  } as unknown as D1Database
}

describe('normalizeSlug', () => {
  it('lowercases and collapses whitespace into hyphens', () => {
    expect(normalizeSlug('  My TCP  ')).toBe('my-tcp')
  })
  it('preserves unicode letters', () => {
    expect(normalizeSlug('我知道的 TCP')).toBe('我知道的-tcp')
  })
})

describe('validateCreateBlogSeriesInput', () => {
  it('trims and accepts valid title, slug, and description', () => {
    expect(
      validateCreateBlogSeriesInput({
        title: '  TCP  ',
        slug: ' my-tcp ',
        description: ' x ',
      }),
    ).toEqual({ title: 'TCP', slug: 'my-tcp', description: 'x' })
  })
  it('rejects empty title', () => {
    expect(() =>
      validateCreateBlogSeriesInput({
        title: '   ',
        slug: 'tcp',
        description: '',
      }),
    ).toThrow('请填写系列名称')
  })
  it('rejects titles longer than 80 chars', () => {
    expect(() =>
      validateCreateBlogSeriesInput({
        title: 'a'.repeat(81),
        slug: 'tcp',
        description: '',
      }),
    ).toThrow('80')
  })
  it('rejects empty slug', () => {
    expect(() =>
      validateCreateBlogSeriesInput({
        title: 'TCP',
        slug: '   ',
        description: '',
      }),
    ).toThrow('请填写系列链接标识')
  })
  it('rejects slugs with invalid characters', () => {
    expect(() =>
      validateCreateBlogSeriesInput({
        title: 'TCP',
        slug: 'tcp/evil',
        description: '',
      }),
    ).toThrow('链接标识只能包含字母、数字、空格和连字符')
  })
})

describe('createBlogSeriesFromData', () => {
  it('rejects anonymous viewers', async () => {
    await expect(
      createBlogSeriesFromData(
        { title: 'TCP', slug: 'tcp', description: '' },
        { viewer: null, db: fakeD1({}) },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects reviewers', async () => {
    await expect(
      createBlogSeriesFromData(
        { title: 'TCP', slug: 'tcp', description: '' },
        { viewer: reviewerViewer, db: fakeD1({}) },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('creates a series for the owner and returns it', async () => {
    const result = await createBlogSeriesFromData(
      { title: 'TCP', slug: 'tcp', description: '' },
      {
        viewer: ownerViewer,
        db: fakeD1({
          selectResult: {
            slug: 'tcp',
            title: 'TCP',
            description: '',
            status: 'draft',
            first_post_slug: null,
          },
        }),
      },
    )
    expect(result.slug).toBe('tcp')
  })

  it('surfaces a friendly error on UNIQUE slug collision', async () => {
    await expect(
      createBlogSeriesFromData(
        { title: 'TCP', slug: 'tcp', description: '' },
        {
          viewer: ownerViewer,
          db: fakeD1({
            insertThrow: new Error(
              'SQLITE_CONSTRAINT: UNIQUE constraint failed: blog_series.slug',
            ),
          }),
        },
      ),
    ).rejects.toThrow('已被占用')
  })
})
