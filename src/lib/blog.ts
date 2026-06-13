import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

export type VisibleBlogSeriesListItem = {
  slug: string
  title: string
  description: string
  first_post_slug: string | null
}

type BlogSeriesStatus = 'ongoing' | 'completed' | 'archived'
type BlogPostStatus = 'published' | 'archived'

type VisibleBlogPostRecord = {
  series_id: number
  series_slug: string
  series_title: string
  series_description: string
  series_status: BlogSeriesStatus
  post_slug: string
  post_title: string
  post_summary: string
  post_content: string
  post_position: number
  post_status: BlogPostStatus
}

export type VisibleBlogPostChapter = {
  slug: string
  title: string
  position: number
  status: BlogPostStatus
}

export type VisibleBlogPostChapterRecord = {
  id: number
  parent_post_id: number | null
  slug: string
  title: string
  position: number
  status: BlogPostStatus
}

export type VisibleBlogPostChapterNode = {
  id: number
  slug: string
  title: string
  position: number
  status: BlogPostStatus
  children: VisibleBlogPostChapterNode[]
}

export type VisibleBlogPostPageData = Omit<VisibleBlogPostRecord, 'series_id'> & {
  chapters: VisibleBlogPostChapterNode[]
}

const VISIBLE_SERIES_STATUSES = ['ongoing', 'completed', 'archived'] as const
const VISIBLE_POST_STATUSES = ['published', 'archived'] as const

function sortChapterNodes(
  nodes: VisibleBlogPostChapterNode[],
): VisibleBlogPostChapterNode[] {
  return nodes
    .toSorted(
      (left, right) => left.position - right.position || left.id - right.id,
    )
    .map((node) => ({
      ...node,
      children: sortChapterNodes(node.children),
    }))
}

export function buildBlogPostChapterTree(
  records: VisibleBlogPostChapterRecord[],
): VisibleBlogPostChapterNode[] {
  const nodesById = new Map<number, VisibleBlogPostChapterNode>()

  for (const record of records) {
    nodesById.set(record.id, {
      id: record.id,
      slug: record.slug,
      title: record.title,
      position: record.position,
      status: record.status,
      children: [],
    })
  }

  const roots: VisibleBlogPostChapterNode[] = []

  for (const record of records) {
    const node = nodesById.get(record.id)

    if (!node) {
      continue
    }

    if (record.parent_post_id === null) {
      roots.push(node)
      continue
    }

    const parent = nodesById.get(record.parent_post_id)

    if (parent) {
      parent.children.push(node)
    }
  }

  return sortChapterNodes(roots)
}

function getDb() {
  return env.peterlits_me
}

export const getVisibleBlogSeries = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { results } = await getDb()
      .prepare(
        `
          SELECT
            blog_series.slug,
            blog_series.title,
            blog_series.description,
            (
              SELECT blog_posts.slug
              FROM blog_posts
              WHERE blog_posts.series_id = blog_series.id
                AND blog_posts.status IN (?, ?)
              ORDER BY blog_posts.position ASC, blog_posts.id ASC
              LIMIT 1
            ) AS first_post_slug
          FROM blog_series
          WHERE blog_series.status IN (?, ?, ?)
          ORDER BY blog_series.created_at ASC, blog_series.id ASC
        `,
      )
      .bind(
        ...VISIBLE_POST_STATUSES,
        ...VISIBLE_SERIES_STATUSES,
      )
      .all<VisibleBlogSeriesListItem>()

    return results
  },
)

export const getVisibleBlogPost = createServerFn({ method: 'GET' })
  .inputValidator((data: { seriesSlug: string; postSlug: string }) => data)
  .handler(async ({ data }) => {
    const post = await getDb()
      .prepare(
        `
          SELECT
            blog_series.id AS series_id,
            blog_series.slug AS series_slug,
            blog_series.title AS series_title,
            blog_series.description AS series_description,
            blog_series.status AS series_status,
            blog_posts.slug AS post_slug,
            blog_posts.title AS post_title,
            blog_posts.summary AS post_summary,
            blog_posts.content AS post_content,
            blog_posts.position AS post_position,
            blog_posts.status AS post_status
          FROM blog_series
          INNER JOIN blog_posts
            ON blog_posts.series_id = blog_series.id
          WHERE blog_series.slug = ?
            AND blog_posts.slug = ?
            AND blog_series.status IN (?, ?, ?)
            AND blog_posts.status IN (?, ?)
          LIMIT 1
        `,
      )
      .bind(
        data.seriesSlug,
        data.postSlug,
        ...VISIBLE_SERIES_STATUSES,
        ...VISIBLE_POST_STATUSES,
      )
      .first<VisibleBlogPostRecord>()

    if (!post) {
      throw notFound()
    }

    const { results: chapters } = await getDb()
      .prepare(
        `
          SELECT
            id,
            parent_post_id,
            slug,
            title,
            position,
            status
          FROM blog_posts
          WHERE series_id = ?
            AND status IN (?, ?)
          ORDER BY position ASC, id ASC
        `,
      )
      .bind(post.series_id, ...VISIBLE_POST_STATUSES)
      .all<VisibleBlogPostChapterRecord>()

    const { series_id: _, ...page } = post

    return {
      ...page,
      chapters: buildBlogPostChapterTree(chapters),
    } satisfies VisibleBlogPostPageData
  })
