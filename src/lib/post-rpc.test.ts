import { describe, expect, it } from 'vitest'

import { createBlogPostFromData, validateCreateBlogPostInput } from './post-rpc'

const ownerViewer = { role: 'owner' }
const reviewerViewer = { role: 'reviewer' }

function fakeD1(handlers: {
  selectSeries?: () => Record<string, unknown> | null
  selectPosition?: () => { next_position: number } | null
  insertThrow?: unknown
}) {
  return {
    prepare(sql: string) {
      if (sql.includes('FROM blog_series')) {
        return {
          bind() {
            return {
              first: async () => handlers.selectSeries?.() ?? null,
            }
          },
        }
      }
      if (sql.includes('MAX(position)')) {
        return {
          bind() {
            return {
              first: async () => handlers.selectPosition?.() ?? null,
            }
          },
        }
      }
      if (sql.includes('INSERT')) {
        return {
          bind() {
            return {
              run: async () => {
                if (handlers.insertThrow) throw handlers.insertThrow
                return { success: true }
              },
            }
          },
        }
      }
      return {
        bind() {
          return { first: async () => null, run: async () => ({}) }
        },
      }
    },
  } as unknown as D1Database
}

describe('validateCreateBlogPostInput', () => {
  it('trims and accepts valid title, slug, and content', () => {
    expect(
      validateCreateBlogPostInput({
        title: '  起步  ',
        slug: ' intro ',
        content: ' x ',
      }),
    ).toEqual({ title: '起步', slug: 'intro', content: 'x' })
  })
  it('rejects empty title', () => {
    expect(() =>
      validateCreateBlogPostInput({
        title: '   ',
        slug: 'intro',
        content: '内容',
      }),
    ).toThrow('请填写博客标题')
  })
  it('rejects titles longer than 80 chars', () => {
    expect(() =>
      validateCreateBlogPostInput({
        title: 'a'.repeat(81),
        slug: 'intro',
        content: '内容',
      }),
    ).toThrow('80')
  })
  it('rejects empty slug', () => {
    expect(() =>
      validateCreateBlogPostInput({
        title: '起步',
        slug: '   ',
        content: '内容',
      }),
    ).toThrow('请填写博客链接标识')
  })
  it('rejects slugs with invalid characters', () => {
    expect(() =>
      validateCreateBlogPostInput({
        title: '起步',
        slug: 'intro/evil',
        content: '内容',
      }),
    ).toThrow('链接标识只能包含字母、数字、空格和连字符')
  })
  it('rejects empty content', () => {
    expect(() =>
      validateCreateBlogPostInput({
        title: '起步',
        slug: 'intro',
        content: '   ',
      }),
    ).toThrow('请填写博客内容')
  })
})

describe('createBlogPostFromData', () => {
  it('rejects anonymous viewers', async () => {
    await expect(
      createBlogPostFromData(
        { title: '起步', slug: 'intro', content: '内容' },
        { viewer: null, db: fakeD1({}), seriesSlug: 'tcp' },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects reviewers', async () => {
    await expect(
      createBlogPostFromData(
        { title: '起步', slug: 'intro', content: '内容' },
        { viewer: reviewerViewer, db: fakeD1({}), seriesSlug: 'tcp' },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects when the series does not exist', async () => {
    await expect(
      createBlogPostFromData(
        { title: '起步', slug: 'intro', content: '内容' },
        {
          viewer: ownerViewer,
          db: fakeD1({ selectSeries: () => null }),
          seriesSlug: 'missing',
        },
      ),
    ).rejects.toThrow('系列不存在')
  })

  it('creates a post for the owner and returns its slug', async () => {
    const result = await createBlogPostFromData(
      { title: '起步', slug: 'intro', content: '内容' },
      {
        viewer: ownerViewer,
        db: fakeD1({
          selectSeries: () => ({ id: 1 }),
          selectPosition: () => ({ next_position: 3 }),
        }),
        seriesSlug: 'tcp',
      },
    )
    expect(result.slug).toBe('intro')
  })

  it('surfaces a friendly error on (series_id, slug) UNIQUE collision', async () => {
    await expect(
      createBlogPostFromData(
        { title: '起步', slug: 'intro', content: '内容' },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectPosition: () => ({ next_position: 1 }),
            insertThrow: new Error(
              'SQLITE_CONSTRAINT: UNIQUE constraint failed: blog_posts.slug',
            ),
          }),
          seriesSlug: 'tcp',
        },
      ),
    ).rejects.toThrow('该博客标识已被占用，请换一个')
  })
})
