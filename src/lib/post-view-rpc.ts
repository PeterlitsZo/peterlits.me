import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'

import { getViewerBlogVisibility } from './auth'
import {
  buildVisitorKey,
  getClientIpFromHeaders,
  isBotUserAgent,
  validateRecordBlogPostViewInput,
} from './post-view-models'
import type { Viewer, ViewerBlogVisibility } from './auth'
import type { RecordBlogPostViewInput } from './post-view-models'

type VisibleBlogPostForViewRecord = {
  id: number
  series_slug: string
  post_slug: string
}

type RequestHeaderSnapshot = {
  userAgent: string
  cfConnectingIp: string
  xForwardedFor: string
  cfIpCountry: string
  acceptLanguage: string
}

type RecordBlogPostViewDeps = {
  db: D1Database
  viewer: Viewer | null
  headers: RequestHeaderSnapshot
  now?: () => number
  shouldCleanup?: (viewedAt: number) => boolean
}

type InsertRunResult = {
  meta?: {
    last_row_id?: number | string
  }
}

const UNIQUE_WINDOW_SECONDS = 24 * 60 * 60
const EVENT_RETENTION_SECONDS = 30 * 24 * 60 * 60

function getDb() {
  return env.peterlits_me
}

function createInClause(values: readonly unknown[]) {
  return values.map(() => '?').join(', ')
}

function getUnixTimestamp() {
  return Math.floor(Date.now() / 1000)
}

function createHeaderReader(headers: RequestHeaderSnapshot) {
  const values = new Map(
    Object.entries({
      'user-agent': headers.userAgent,
      'cf-connecting-ip': headers.cfConnectingIp,
      'x-forwarded-for': headers.xForwardedFor,
      'cf-ipcountry': headers.cfIpCountry,
      'accept-language': headers.acceptLanguage,
    }),
  )

  return {
    get(name: string) {
      return values.get(name.toLowerCase()) ?? null
    },
  }
}

function getHeaderSnapshot(): RequestHeaderSnapshot {
  return {
    userAgent: getRequestHeader('user-agent') ?? '',
    cfConnectingIp: getRequestHeader('cf-connecting-ip') ?? '',
    xForwardedFor: getRequestHeader('x-forwarded-for') ?? '',
    cfIpCountry: getRequestHeader('cf-ipcountry') ?? '',
    acceptLanguage: getRequestHeader('accept-language') ?? '',
  }
}

function isUniqueConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /unique/i.test(message)
}

function shouldDeleteOldBlogPostViewEvents(viewedAt: number) {
  return Math.floor(viewedAt / 60) % 100 === 0
}

export function buildVisibleBlogPostForViewQuery({
  postSlug,
  seriesSlug,
  visibility,
}: {
  visibility: ViewerBlogVisibility
  seriesSlug: string
  postSlug: string
}) {
  const seriesStatusClause = createInClause(visibility.seriesStatuses)
  const postStatusClause = createInClause(visibility.postStatuses)

  return {
    sql: `
      SELECT
        blog_posts.id,
        blog_series.slug AS series_slug,
        blog_posts.slug AS post_slug
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
  }
}

export async function deleteOldBlogPostViewEventsFromData({
  db,
  now = getUnixTimestamp,
}: {
  db: D1Database
  now?: () => number
}) {
  const cutoff = now() - EVENT_RETENTION_SECONDS

  await db
    .prepare(
      `
        DELETE FROM blog_post_view_events
        WHERE viewed_at < ?
      `,
    )
    .bind(cutoff)
    .run()

  return { ok: true as const }
}

export async function recordBlogPostViewFromData(
  data: RecordBlogPostViewInput,
  deps: RecordBlogPostViewDeps,
) {
  const input = validateRecordBlogPostViewInput(data)
  const visibility = getViewerBlogVisibility(deps.viewer)
  const postQuery = buildVisibleBlogPostForViewQuery({
    visibility,
    seriesSlug: input.seriesSlug,
    postSlug: input.postSlug,
  })

  const post = await deps.db
    .prepare(postQuery.sql)
    .bind(...postQuery.values)
    .first<VisibleBlogPostForViewRecord>()

  if (!post) {
    return { ok: true as const, ignored: true as const }
  }

  const headerReader = createHeaderReader(deps.headers)
  const ipAddress = getClientIpFromHeaders(headerReader)
  const userAgent = deps.headers.userAgent.trim()
  const viewedAt = deps.now?.() ?? getUnixTimestamp()
  const isBot = isBotUserAgent(userAgent)
  const visitorKey = await buildVisitorKey({
    viewer: deps.viewer,
    ipAddress,
    userAgent,
  })
  let eventId: number

  try {
    const insertResult = (await deps.db
      .prepare(
        `
          INSERT INTO blog_post_view_events (
            post_id,
            view_id,
            visitor_key,
            viewer_user_id,
            viewed_at,
            series_slug,
            post_slug,
            path,
            referrer,
            client_language,
            client_timezone,
            viewport_width,
            viewport_height,
            screen_width,
            screen_height,
            client_viewed_at,
            ip_address,
            user_agent,
            cf_ip_country,
            accept_language,
            is_bot,
            is_counted_unique_24h
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
      )
      .bind(
        post.id,
        input.viewId,
        visitorKey,
        deps.viewer?.id ?? null,
        viewedAt,
        post.series_slug,
        post.post_slug,
        input.path,
        input.referrer,
        input.clientLanguage,
        input.clientTimezone,
        input.viewportWidth,
        input.viewportHeight,
        input.screenWidth,
        input.screenHeight,
        input.clientViewedAt,
        ipAddress,
        userAgent,
        deps.headers.cfIpCountry.trim(),
        deps.headers.acceptLanguage.trim(),
        isBot ? 1 : 0,
      )
      .run()) as InsertRunResult

    const rawEventId = insertResult.meta?.last_row_id
    eventId =
      typeof rawEventId === 'number'
        ? rawEventId
        : Number.parseInt(String(rawEventId), 10)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: true as const, duplicate: true as const }
    }

    throw error
  }

  const firstRecentEvent = isBot
    ? null
    : await deps.db
        .prepare(
          `
            SELECT id
            FROM blog_post_view_events
            WHERE post_id = ?
              AND visitor_key = ?
              AND is_bot = 0
              AND viewed_at >= ?
            ORDER BY viewed_at ASC, id ASC
            LIMIT 1
          `,
        )
        .bind(post.id, visitorKey, viewedAt - UNIQUE_WINDOW_SECONDS)
        .first<{ id: number }>()

  const isCountedUnique24h =
    !isBot && Number.isInteger(eventId) && firstRecentEvent?.id === eventId

  if (isCountedUnique24h) {
    await deps.db
      .prepare(
        `
          UPDATE blog_post_view_events
          SET is_counted_unique_24h = 1
          WHERE id = ?
        `,
      )
      .bind(eventId)
      .run()
  }

  await deps.db
    .prepare(
      `
        INSERT INTO blog_post_daily_views (
          post_id,
          day,
          human_pv,
          unique_24h_pv,
          bot_pv,
          updated_at
        )
        VALUES (?, date(?, 'unixepoch'), ?, ?, ?, unixepoch())
        ON CONFLICT(post_id, day) DO UPDATE SET
          human_pv = human_pv + excluded.human_pv,
          unique_24h_pv = unique_24h_pv + excluded.unique_24h_pv,
          bot_pv = bot_pv + excluded.bot_pv,
          updated_at = unixepoch()
      `,
    )
    .bind(
      post.id,
      viewedAt,
      isBot ? 0 : 1,
      isCountedUnique24h ? 1 : 0,
      isBot ? 1 : 0,
    )
    .run()

  if ((deps.shouldCleanup ?? shouldDeleteOldBlogPostViewEvents)(viewedAt)) {
    try {
      await deleteOldBlogPostViewEventsFromData({
        db: deps.db,
        now: () => viewedAt,
      })
    } catch {
      // Cleanup is opportunistic and must not affect page view recording.
    }
  }

  return { ok: true as const }
}

export const recordBlogPostView = createServerFn({ method: 'POST' })
  .validator(validateRecordBlogPostViewInput)
  .handler(async ({ data }) => {
    const { getViewerFromRequest } = await import('./auth.server')
    const viewer = await getViewerFromRequest()

    return await recordBlogPostViewFromData(data, {
      db: getDb(),
      viewer,
      headers: getHeaderSnapshot(),
    })
  })
