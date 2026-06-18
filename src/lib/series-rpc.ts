import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import type { VisibleBlogSeriesListItem } from './blog-models'

function getDb() {
  return env.peterlits_me
}

export type CreateBlogSeriesInput = {
  title: string
  slug: string
  description: string
}

const TITLE_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500
const SLUG_MAX_LENGTH = 80
const SLUG_PATTERN =
  /^[\p{Letter}\p{Number}]+(?:[\p{Letter}\p{Number}\s-]*[\p{Letter}\p{Number}])?$/u

// Normalizes a user-entered slug: trims, lowercases, collapses whitespace
// into hyphens. Kept permissive on input (validated separately) so the user's
// intended slug is preserved rather than silently rewritten.
export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
}

export function validateCreateBlogSeriesInput(
  data: unknown,
): CreateBlogSeriesInput {
  if (!data || typeof data !== 'object') {
    throw new Error('请填写系列信息')
  }

  const record = data as {
    title?: unknown
    slug?: unknown
    description?: unknown
  }
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const rawSlug = typeof record.slug === 'string' ? record.slug.trim() : ''
  const description =
    typeof record.description === 'string' ? record.description.trim() : ''

  if (!title) {
    throw new Error('请填写系列名称')
  }
  if (title.length > TITLE_MAX_LENGTH) {
    throw new Error('系列名称不能超过 80 个字符')
  }

  if (!rawSlug) {
    throw new Error('请填写系列链接标识')
  }
  if (rawSlug.length > SLUG_MAX_LENGTH) {
    throw new Error('系列链接标识不能超过 80 个字符')
  }
  if (!SLUG_PATTERN.test(rawSlug)) {
    throw new Error('链接标识只能包含字母、数字、空格和连字符')
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new Error('系列描述不能超过 500 个字符')
  }

  return { title, slug: normalizeSlug(rawSlug), description }
}

export async function createBlogSeriesFromData(
  data: CreateBlogSeriesInput,
  deps: {
    viewer: { role: string } | null
    db: D1Database
  },
): Promise<VisibleBlogSeriesListItem> {
  if (!deps.viewer || deps.viewer.role !== 'owner') {
    throw new Error('没有权限执行此操作')
  }

  try {
    await deps.db
      .prepare(
        `
          INSERT INTO blog_series (slug, title, description, status)
          VALUES (?, ?, ?, 'draft')
        `,
      )
      .bind(data.slug, data.title, data.description)
      .run()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('UNIQUE')) {
      throw new Error('该链接标识已被占用，请换一个')
    }
    throw error
  }

  const series = await deps.db
    .prepare(
      `
        SELECT
          slug,
          title,
          description,
          status,
          NULL AS first_post_slug
        FROM blog_series
        WHERE slug = ?
        LIMIT 1
      `,
    )
    .bind(data.slug)
    .first<VisibleBlogSeriesListItem>()

  if (!series) {
    throw new Error('创建系列失败')
  }

  return series
}

export const createBlogSeries = createServerFn({ method: 'POST' })
  .validator(validateCreateBlogSeriesInput)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    return createBlogSeriesFromData(data, { viewer, db: getDb() })
  })
