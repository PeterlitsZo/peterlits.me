import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import { normalizeSlug } from './series-rpc'

export type CreateBlogPostInput = {
  title: string
  slug: string
  content: string
  parentPostSlug?: string
}

export type EditableBlogPost = {
  id: number
  title: string
  slug: string
  content: string
}

export type ReorderBlogPostsInput = {
  seriesSlug: string
  posts: Array<{
    id: number
    parentPostId: number | null
    position: number
  }>
}

type BlogPostOrderRecord = {
  id: number
  parent_post_id: number | null
  position: number
}

const TITLE_MAX_LENGTH = 80
const SLUG_MAX_LENGTH = 80
const CONTENT_MAX_LENGTH = 100_000
const SLUG_PATTERN =
  /^[\p{Letter}\p{Number}]+(?:[\p{Letter}\p{Number}\s-]*[\p{Letter}\p{Number}])?$/u

export function validateCreateBlogPostInput(
  data: unknown,
): CreateBlogPostInput {
  if (!data || typeof data !== 'object') {
    throw new Error('请填写博客信息')
  }

  const record = data as { title?: unknown; slug?: unknown; content?: unknown }
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const rawSlug = typeof record.slug === 'string' ? record.slug.trim() : ''
  const content =
    typeof record.content === 'string' ? record.content.trim() : ''

  if (!title) {
    throw new Error('请填写博客标题')
  }
  if (title.length > TITLE_MAX_LENGTH) {
    throw new Error('博客标题不能超过 80 个字符')
  }

  if (!rawSlug) {
    throw new Error('请填写博客链接标识')
  }
  if (rawSlug.length > SLUG_MAX_LENGTH) {
    throw new Error('博客链接标识不能超过 80 个字符')
  }
  if (!SLUG_PATTERN.test(rawSlug)) {
    throw new Error('链接标识只能包含字母、数字、空格和连字符')
  }

  if (!content) {
    throw new Error('请填写博客内容')
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new Error('博客内容过长')
  }

  return { title, slug: normalizeSlug(rawSlug), content }
}

export async function createBlogPostFromData(
  data: CreateBlogPostInput,
  deps: {
    viewer: { role: string } | null
    db: D1Database
    parentPostSlug?: string
    seriesSlug: string
  },
): Promise<{ slug: string }> {
  if (!deps.viewer || deps.viewer.role !== 'owner') {
    throw new Error('没有权限执行此操作')
  }

  const series = await deps.db
    .prepare('SELECT id FROM blog_series WHERE slug = ? LIMIT 1')
    .bind(deps.seriesSlug)
    .first<{ id: number }>()

  if (!series) {
    throw new Error('系列不存在')
  }

  const parent = deps.parentPostSlug
    ? await deps.db
        .prepare(
          `SELECT id
           FROM blog_posts
           WHERE series_id = ? AND slug = ?
           LIMIT 1`,
        )
        .bind(series.id, deps.parentPostSlug)
        .first<{ id: number }>()
    : null

  if (deps.parentPostSlug && !parent) {
    throw new Error('父博客不存在')
  }

  const positionRow = await deps.db
    .prepare(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
       FROM blog_posts
       WHERE series_id = ?
         AND ${parent ? 'parent_post_id = ?' : 'parent_post_id IS NULL'}`,
    )
    .bind(...(parent ? [series.id, parent.id] : [series.id]))
    .first<{ next_position: number }>()

  const position = positionRow?.next_position ?? 1

  try {
    await deps.db
      .prepare(
        `INSERT INTO blog_posts
           (series_id, parent_post_id, slug, title, summary, content, position, status)
         VALUES (?, ?, ?, ?, '', ?, ?, 'draft')`,
      )
      .bind(series.id, parent?.id ?? null, data.slug, data.title, data.content, position)
      .run()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('UNIQUE') && message.includes('slug')) {
      throw new Error('该博客标识已被占用，请换一个')
    }
    throw error
  }

  return { slug: data.slug }
}

function assertOwner(viewer: { role: string } | null) {
  if (!viewer || viewer.role !== 'owner') {
    throw new Error('没有权限执行此操作')
  }
}

export async function getEditableBlogPostFromData(
  data: { seriesSlug: string; postSlug: string },
  deps: {
    viewer: { role: string } | null
    db: D1Database
  },
): Promise<EditableBlogPost> {
  assertOwner(deps.viewer)

  const post = await deps.db
    .prepare(
      `SELECT
         blog_posts.id,
         blog_posts.title,
         blog_posts.slug,
         blog_posts.content
       FROM blog_posts
       INNER JOIN blog_series
         ON blog_series.id = blog_posts.series_id
       WHERE blog_series.slug = ?
         AND blog_posts.slug = ?
       LIMIT 1`,
    )
    .bind(data.seriesSlug, data.postSlug)
    .first<EditableBlogPost>()

  if (!post) {
    throw new Error('博客不存在')
  }

  return post
}

export async function updateBlogPostFromData(
  data: CreateBlogPostInput,
  deps: {
    viewer: { role: string } | null
    db: D1Database
    seriesSlug: string
    postSlug: string
  },
): Promise<{ slug: string }> {
  assertOwner(deps.viewer)
  const input = validateCreateBlogPostInput(data)
  const post = await getEditableBlogPostFromData(
    { seriesSlug: deps.seriesSlug, postSlug: deps.postSlug },
    { viewer: deps.viewer, db: deps.db },
  )

  try {
    await deps.db
      .prepare(
        `UPDATE blog_posts
         SET title = ?, slug = ?, content = ?
         WHERE id = ?`,
      )
      .bind(input.title, input.slug, input.content, post.id)
      .run()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('UNIQUE') && message.includes('slug')) {
      throw new Error('该博客标识已被占用，请换一个')
    }
    throw error
  }

  return { slug: input.slug }
}

function validateReorderPayload(
  payload: ReorderBlogPostsInput['posts'],
  currentPosts: BlogPostOrderRecord[],
) {
  const currentIds = new Set(currentPosts.map((post) => post.id))
  const seenIds = new Set<number>()

  for (const item of payload) {
    if (seenIds.has(item.id)) {
      throw new Error('排序数据包含重复博客')
    }
    seenIds.add(item.id)
  }

  if (seenIds.size !== currentIds.size) {
    throw new Error('排序数据必须包含当前系列的全部博客')
  }

  for (const id of seenIds) {
    if (!currentIds.has(id)) {
      throw new Error('排序数据必须包含当前系列的全部博客')
    }
  }

  const parentById = new Map<number, number | null>()

  for (const item of payload) {
    if (!Number.isInteger(item.position) || item.position <= 0) {
      throw new Error('同级博客排序必须从 1 连续递增')
    }
    if (item.parentPostId === item.id) {
      throw new Error('排序数据不能形成循环层级')
    }
    if (item.parentPostId !== null && !seenIds.has(item.parentPostId)) {
      throw new Error('父博客不属于当前排序数据')
    }
    parentById.set(item.id, item.parentPostId)
  }

  for (const item of payload) {
    const ancestors = new Set<number>()
    let parentId = item.parentPostId

    while (parentId !== null) {
      if (ancestors.has(parentId) || parentId === item.id) {
        throw new Error('排序数据不能形成循环层级')
      }
      ancestors.add(parentId)
      parentId = parentById.get(parentId) ?? null
    }
  }

  const positionsByParent = new Map<number | null, number[]>()

  for (const item of payload) {
    const positions = positionsByParent.get(item.parentPostId) ?? []
    positions.push(item.position)
    positionsByParent.set(item.parentPostId, positions)
  }

  for (const positions of positionsByParent.values()) {
    const sorted = [...positions].sort((left, right) => left - right)

    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index] !== index + 1) {
        throw new Error('同级博客排序必须从 1 连续递增')
      }
    }
  }
}

export async function reorderBlogPostsFromData(
  data: ReorderBlogPostsInput,
  deps: {
    viewer: { role: string } | null
    db: D1Database
  },
): Promise<{ success: true }> {
  assertOwner(deps.viewer)

  const series = await deps.db
    .prepare('SELECT id FROM blog_series WHERE slug = ? LIMIT 1')
    .bind(data.seriesSlug)
    .first<{ id: number }>()

  if (!series) {
    throw new Error('系列不存在')
  }

  const { results: currentPosts } = await deps.db
    .prepare(
      `SELECT id, parent_post_id, position
       FROM blog_posts
       WHERE series_id = ?`,
    )
    .bind(series.id)
    .all<BlogPostOrderRecord>()

  validateReorderPayload(data.posts, currentPosts)

  const update = deps.db.prepare(
    `UPDATE blog_posts
     SET parent_post_id = ?, position = ?
     WHERE id = ?`,
  )

  for (const [index, item] of data.posts.entries()) {
    await update.bind(item.parentPostId, -(index + 1), item.id).run()
  }

  for (const item of data.posts) {
    await update.bind(item.parentPostId, item.position, item.id).run()
  }

  return { success: true }
}

export const createBlogPost = createServerFn({ method: 'POST' })
  .validator(
    (data: { parentPostSlug?: string; seriesSlug: string } & CreateBlogPostInput) =>
      data,
  )
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    const { parentPostSlug, seriesSlug, ...input } = data
    return createBlogPostFromData(input, {
      viewer,
      db: env.peterlits_me,
      parentPostSlug,
      seriesSlug,
    })
  })

export const getEditableBlogPost = createServerFn({ method: 'GET' })
  .validator((data: { seriesSlug: string; postSlug: string }) => data)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    return getEditableBlogPostFromData(data, {
      viewer,
      db: env.peterlits_me,
    })
  })

export const updateBlogPost = createServerFn({ method: 'POST' })
  .validator(
    (data: { seriesSlug: string; postSlug: string } & CreateBlogPostInput) =>
      data,
  )
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    const { seriesSlug, postSlug, ...input } = data
    return updateBlogPostFromData(input, {
      viewer,
      db: env.peterlits_me,
      seriesSlug,
      postSlug,
    })
  })

export const reorderBlogPosts = createServerFn({ method: 'POST' })
  .validator((data: ReorderBlogPostsInput) => data)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    return reorderBlogPostsFromData(data, {
      viewer,
      db: env.peterlits_me,
    })
  })
