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
import type { Viewer, ViewerBlogVisibility } from './auth'

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

function createInClause(values: readonly unknown[]) {
  return values.map(() => '?').join(', ')
}

export function buildVisibleBlogSeriesQuery(visibility: ViewerBlogVisibility) {
  const postStatusClause = createInClause(visibility.postStatuses)
  const seriesStatusClause = createInClause(visibility.seriesStatuses)

  return {
    sql: `
      SELECT
        blog_series.slug,
        blog_series.title,
        blog_series.description,
        (
          SELECT blog_posts.slug
          FROM blog_posts
          WHERE blog_posts.series_id = blog_series.id
            AND blog_posts.status IN (${postStatusClause})
          ORDER BY blog_posts.position ASC, blog_posts.id ASC
          LIMIT 1
        ) AS first_post_slug,
        blog_series.status AS status
      FROM blog_series
      WHERE blog_series.status IN (${seriesStatusClause})
      ORDER BY blog_series.created_at ASC, blog_series.id ASC
    `,
    values: [...visibility.postStatuses, ...visibility.seriesStatuses],
  }
}

export function buildVisibleBlogPostQueries({
  visibility,
  seriesId,
  seriesSlug,
  postSlug,
}: {
  visibility: ViewerBlogVisibility
  seriesId: number
  seriesSlug: string
  postSlug: string
}) {
  const seriesStatusClause = createInClause(visibility.seriesStatuses)
  const postStatusClause = createInClause(visibility.postStatuses)

  return {
    post: {
      sql: `
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
          AND blog_series.status IN (${seriesStatusClause})
          AND blog_posts.status IN (${postStatusClause})
        LIMIT 1
      `,
      values: [
        seriesSlug,
        postSlug,
        ...visibility.seriesStatuses,
        ...visibility.postStatuses,
      ],
    },
    chapters: {
      sql: `
        SELECT
          id,
          parent_post_id,
          slug,
          title,
          position,
          status
        FROM blog_posts
        WHERE series_id = ?
          AND status IN (${postStatusClause})
        ORDER BY position ASC, id ASC
      `,
      values: [seriesId, ...visibility.postStatuses],
    },
  }
}

export const getVisibleBlogSeries = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()
    const visibility = getVisibility(viewer)
    const query = buildVisibleBlogSeriesQuery(visibility)

    const { results } = await getDb()
      .prepare(query.sql)
      .bind(...query.values)
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
    const queries = buildVisibleBlogPostQueries({
      visibility,
      seriesId: 0,
      seriesSlug: data.seriesSlug,
      postSlug: data.postSlug,
    })

    const post = await getDb()
      .prepare(queries.post.sql)
      .bind(...queries.post.values)
      .first<VisibleBlogPostRecord>()

    if (!post) {
      throw notFound()
    }

    const chapterQuery = buildVisibleBlogPostQueries({
      visibility,
      seriesId: post.series_id,
      seriesSlug: data.seriesSlug,
      postSlug: data.postSlug,
    })

    const { results: chapters } = await getDb()
      .prepare(chapterQuery.chapters.sql)
      .bind(...chapterQuery.chapters.values)
      .all<VisibleBlogPostChapterRecord>()

    const { series_id: _, ...page } = post

    return {
      ...page,
      chapters: buildBlogPostChapterTree(chapters),
    } satisfies VisibleBlogPostPageData
  })
