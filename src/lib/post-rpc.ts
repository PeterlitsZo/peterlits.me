import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import { normalizeSlug } from './series-rpc'

export type CreateBlogPostInput = {
  title: string
  slug: string
  content: string
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

  const positionRow = await deps.db
    .prepare(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
       FROM blog_posts
       WHERE series_id = ? AND parent_post_id IS NULL`,
    )
    .bind(series.id)
    .first<{ next_position: number }>()

  const position = positionRow?.next_position ?? 1

  try {
    await deps.db
      .prepare(
        `INSERT INTO blog_posts
           (series_id, parent_post_id, slug, title, summary, content, position, status)
         VALUES (?, NULL, ?, ?, '', ?, ?, 'draft')`,
      )
      .bind(series.id, data.slug, data.title, data.content, position)
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

export const createBlogPost = createServerFn({ method: 'POST' })
  .validator((data: { seriesSlug: string } & CreateBlogPostInput) => data)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    const { seriesSlug, ...input } = data
    return createBlogPostFromData(input, {
      viewer,
      db: env.peterlits_me,
      seriesSlug,
    })
  })
