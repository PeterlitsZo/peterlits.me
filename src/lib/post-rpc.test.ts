import { describe, expect, it } from 'vitest'

import {
  createBlogPostFromData,
  getEditableBlogPostFromData,
  reorderBlogPostsFromData,
  updateBlogPostFromData,
  validateCreateBlogPostInput,
} from './post-rpc'

const ownerViewer = { role: 'owner' }
const reviewerViewer = { role: 'reviewer' }

function fakeD1(handlers: {
  selectSeries?: () => Record<string, unknown> | null
  selectParent?: () => Record<string, unknown> | null
  selectEditablePost?: () => Record<string, unknown> | null
  selectAllPosts?: () => Array<Record<string, unknown>>
  selectPosition?: () => { next_position: number } | null
  insertThrow?: unknown
  insertBinds?: unknown[][]
  updateThrow?: unknown
  updateBinds?: unknown[][]
}) {
  return {
    prepare(sql: string) {
      if (sql.includes('SELECT id, parent_post_id, position')) {
        return {
          bind() {
            return {
              all: async () => ({ results: handlers.selectAllPosts?.() ?? [] }),
            }
          },
        }
      }
      if (sql.includes('FROM blog_series')) {
        return {
          bind() {
            return {
              first: async () => handlers.selectSeries?.() ?? null,
            }
          },
        }
      }
      if (sql.includes('FROM blog_posts') && sql.includes('slug = ?')) {
        return {
          bind() {
            return {
              first: async () =>
                sql.includes('title') || sql.includes('content')
                  ? (handlers.selectEditablePost?.() ?? null)
                  : (handlers.selectParent?.() ?? null),
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
          bind(...values: unknown[]) {
            handlers.insertBinds?.push(values)
            return {
              run: async () => {
                if (handlers.insertThrow) throw handlers.insertThrow
                return { success: true }
              },
            }
          },
        }
      }
      if (sql.includes('UPDATE blog_posts')) {
        return {
          bind(...values: unknown[]) {
            handlers.updateBinds?.push(values)
            return {
              run: async () => {
                if (handlers.updateThrow) throw handlers.updateThrow
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

describe('getEditableBlogPostFromData', () => {
  it('rejects reviewers', async () => {
    await expect(
      getEditableBlogPostFromData({ seriesSlug: 'tcp', postSlug: 'intro' }, {
        viewer: reviewerViewer,
        db: fakeD1({}),
      }),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('returns editable post fields for owners', async () => {
    await expect(
      getEditableBlogPostFromData({ seriesSlug: 'tcp', postSlug: 'intro' }, {
        viewer: ownerViewer,
        db: fakeD1({
          selectEditablePost: () => ({
            id: 1,
            title: '起步',
            slug: 'intro',
            content: '内容',
          }),
        }),
      }),
    ).resolves.toEqual({
      id: 1,
      title: '起步',
      slug: 'intro',
      content: '内容',
    })
  })

  it('rejects missing posts', async () => {
    await expect(
      getEditableBlogPostFromData({ seriesSlug: 'tcp', postSlug: 'missing' }, {
        viewer: ownerViewer,
        db: fakeD1({ selectEditablePost: () => null }),
      }),
    ).rejects.toThrow('博客不存在')
  })
})

describe('updateBlogPostFromData', () => {
  it('rejects anonymous viewers', async () => {
    await expect(
      updateBlogPostFromData(
        { title: '起步', slug: 'intro', content: '内容' },
        {
          viewer: null,
          db: fakeD1({}),
          seriesSlug: 'tcp',
          postSlug: 'intro',
        },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('updates editable fields and returns the final slug', async () => {
    const updateBinds: unknown[][] = []

    const result = await updateBlogPostFromData(
      { title: '  起步  ', slug: ' intro-2 ', content: '  新内容  ' },
      {
        viewer: ownerViewer,
        db: fakeD1({
          selectEditablePost: () => ({ id: 4 }),
          updateBinds,
        }),
        seriesSlug: 'tcp',
        postSlug: 'intro',
      },
    )

    expect(result).toEqual({ slug: 'intro-2' })
    expect(updateBinds).toEqual([['起步', 'intro-2', '新内容', 4]])
  })

  it('surfaces a friendly error on slug collision', async () => {
    await expect(
      updateBlogPostFromData(
        { title: '起步', slug: 'intro-2', content: '内容' },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectEditablePost: () => ({ id: 4 }),
            updateThrow: new Error(
              'SQLITE_CONSTRAINT: UNIQUE constraint failed: blog_posts.slug',
            ),
          }),
          seriesSlug: 'tcp',
          postSlug: 'intro',
        },
      ),
    ).rejects.toThrow('该博客标识已被占用，请换一个')
  })
})

describe('reorderBlogPostsFromData', () => {
  const currentPosts = [
    { id: 1, parent_post_id: null, position: 1 },
    { id: 2, parent_post_id: null, position: 2 },
    { id: 3, parent_post_id: 2, position: 1 },
  ]

  it('rejects reviewers', async () => {
    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 1, parentPostId: null, position: 1 },
            { id: 2, parentPostId: null, position: 2 },
            { id: 3, parentPostId: 2, position: 1 },
          ],
        },
        { viewer: reviewerViewer, db: fakeD1({}) },
      ),
    ).rejects.toThrow('没有权限执行此操作')
  })

  it('rejects duplicate post ids', async () => {
    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 1, parentPostId: null, position: 1 },
            { id: 1, parentPostId: null, position: 2 },
            { id: 3, parentPostId: null, position: 3 },
          ],
        },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectAllPosts: () => currentPosts,
          }),
        },
      ),
    ).rejects.toThrow('排序数据包含重复博客')
  })

  it('rejects payloads that omit current posts', async () => {
    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 1, parentPostId: null, position: 1 },
            { id: 2, parentPostId: null, position: 2 },
          ],
        },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectAllPosts: () => currentPosts,
          }),
        },
      ),
    ).rejects.toThrow('排序数据必须包含当前系列的全部博客')
  })

  it('rejects invalid parent ids', async () => {
    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 1, parentPostId: null, position: 1 },
            { id: 2, parentPostId: null, position: 2 },
            { id: 3, parentPostId: 999, position: 1 },
          ],
        },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectAllPosts: () => currentPosts,
          }),
        },
      ),
    ).rejects.toThrow('父博客不属于当前排序数据')
  })

  it('rejects cycles', async () => {
    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 1, parentPostId: 3, position: 1 },
            { id: 2, parentPostId: 1, position: 1 },
            { id: 3, parentPostId: 2, position: 1 },
          ],
        },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectAllPosts: () => currentPosts,
          }),
        },
      ),
    ).rejects.toThrow('排序数据不能形成循环层级')
  })

  it('rejects non-continuous sibling positions', async () => {
    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 1, parentPostId: null, position: 1 },
            { id: 2, parentPostId: null, position: 3 },
            { id: 3, parentPostId: 2, position: 1 },
          ],
        },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectAllPosts: () => currentPosts,
          }),
        },
      ),
    ).rejects.toThrow('同级博客排序必须从 1 连续递增')
  })

  it('persists cross-level reorder data with temporary positions first', async () => {
    const updateBinds: unknown[][] = []

    await expect(
      reorderBlogPostsFromData(
        {
          seriesSlug: 'tcp',
          posts: [
            { id: 2, parentPostId: null, position: 1 },
            { id: 1, parentPostId: 2, position: 1 },
            { id: 3, parentPostId: 2, position: 2 },
          ],
        },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectAllPosts: () => currentPosts,
            updateBinds,
          }),
        },
      ),
    ).resolves.toEqual({ success: true })

    expect(updateBinds).toEqual([
      [null, -1, 2],
      [2, -2, 1],
      [2, -3, 3],
      [null, 1, 2],
      [2, 1, 1],
      [2, 2, 3],
    ])
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
    const insertBinds: unknown[][] = []
    const result = await createBlogPostFromData(
      { title: '起步', slug: 'intro', content: '内容' },
      {
        viewer: ownerViewer,
        db: fakeD1({
          selectSeries: () => ({ id: 1 }),
          selectPosition: () => ({ next_position: 3 }),
          insertBinds,
        }),
        seriesSlug: 'tcp',
      },
    )
    expect(result.slug).toBe('intro')
    expect(insertBinds).toEqual([[1, null, 'intro', '起步', '内容', 3]])
  })

  it('creates a child post below the requested parent slug', async () => {
    const insertBinds: unknown[][] = []

    const result = await createBlogPostFromData(
      { title: '数据传输', slug: 'data-transfer', content: '内容' },
      {
        viewer: ownerViewer,
        db: fakeD1({
          selectSeries: () => ({ id: 1 }),
          selectParent: () => ({ id: 8 }),
          selectPosition: () => ({ next_position: 2 }),
          insertBinds,
        }),
        parentPostSlug: 'runtime',
        seriesSlug: 'tcp',
      },
    )

    expect(result.slug).toBe('data-transfer')
    expect(insertBinds).toEqual([
      [1, 8, 'data-transfer', '数据传输', '内容', 2],
    ])
  })

  it('rejects child creation when the parent post does not exist', async () => {
    await expect(
      createBlogPostFromData(
        { title: '数据传输', slug: 'data-transfer', content: '内容' },
        {
          viewer: ownerViewer,
          db: fakeD1({
            selectSeries: () => ({ id: 1 }),
            selectParent: () => null,
          }),
          parentPostSlug: 'missing',
          seriesSlug: 'tcp',
        },
      ),
    ).rejects.toThrow('父博客不存在')
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
