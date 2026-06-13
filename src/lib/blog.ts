import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

import { getViewerBlogVisibility } from './auth'
import {
  buildBlogPostChapterTree,
} from './blog-models'
import type {
  VisibleBlogPostChapterRecord,
  VisibleBlogPostPageData,
  VisibleBlogSeriesListItem,
} from './blog-models'
import type { Viewer } from './auth'

type VisibleBlogPostRecord = {
  series_id: number
  series_slug: string
  series_title: string
  series_description: string
  series_status: 'draft' | 'ongoing' | 'completed' | 'archived'
  post_slug: string
  post_title: string
  post_summary: string
  post_content: string
  post_position: number
  post_status: 'draft' | 'published' | 'archived'
}

function getDb() {
  return env.peterlits_me
}

function getVisibility(viewer: Viewer | null) {
  return getViewerBlogVisibility(viewer)
}

export const getVisibleBlogSeries = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    const visibility = getVisibility(viewer)

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
                AND blog_posts.status IN (?, ?, ?)
              ORDER BY blog_posts.position ASC, blog_posts.id ASC
              LIMIT 1
            ) AS first_post_slug,
            blog_series.status AS status
          FROM blog_series
          WHERE blog_series.status IN (?, ?, ?, ?)
          ORDER BY blog_series.created_at ASC, blog_series.id ASC
        `,
      )
      .bind(...visibility.postStatuses, ...visibility.seriesStatuses)
      .all<VisibleBlogSeriesListItem>()

    return results
  },
)

export const getVisibleBlogPost = createServerFn({ method: 'GET' })
  .validator((data: { seriesSlug: string; postSlug: string }) => data)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    const visibility = getVisibility(viewer)

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
            AND blog_series.status IN (?, ?, ?, ?)
            AND blog_posts.status IN (?, ?, ?)
          LIMIT 1
        `,
      )
      .bind(
        data.seriesSlug,
        data.postSlug,
        ...visibility.seriesStatuses,
        ...visibility.postStatuses,
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
            AND status IN (?, ?, ?)
          ORDER BY position ASC, id ASC
        `,
      )
      .bind(post.series_id, ...visibility.postStatuses)
      .all<VisibleBlogPostChapterRecord>()

    const { series_id: _, ...page } = post

    return {
      ...page,
      chapters: buildBlogPostChapterTree(chapters),
    } satisfies VisibleBlogPostPageData
  })
