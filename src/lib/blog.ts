import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

type BlogSeriesListItem = {
  slug: string
  title: string
  description: string
  first_post_slug: string | null
}

type BlogPostPageData = {
  series_slug: string
  series_title: string
  series_description: string
  series_status: 'ongoing' | 'completed' | 'archived'
  post_slug: string
  post_title: string
  post_summary: string
  post_content: string
  post_position: number
  post_status: 'published' | 'archived'
}

const VISIBLE_SERIES_STATUSES = ['ongoing', 'completed', 'archived'] as const
const VISIBLE_POST_STATUSES = ['published', 'archived'] as const

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
      .all<BlogSeriesListItem>()

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
      .first<BlogPostPageData>()

    if (!post) {
      throw notFound()
    }

    return post
  })
