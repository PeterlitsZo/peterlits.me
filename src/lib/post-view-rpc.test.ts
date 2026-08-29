// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildVisibleBlogPostForViewQuery,
  deleteOldBlogPostViewEventsFromData,
  recordBlogPostViewFromData,
} from './post-view-rpc'
import {
  buildVisitorKey,
  getClientIpFromHeaders,
  isBotUserAgent,
  validateRecordBlogPostViewInput,
} from './post-view-models'
import type { ViewerBlogVisibility } from './auth'
import type { RecordBlogPostViewInput } from './post-view-models'

type FakePost = {
  id: number
  seriesSlug: string
  postSlug: string
  seriesStatus: 'draft' | 'ongoing' | 'completed' | 'archived'
  postStatus: 'draft' | 'published' | 'archived'
}

type FakeEvent = {
  id: number
  post_id: number
  view_id: string
  visitor_key: string
  viewer_user_id: number | null
  viewed_at: number
  series_slug: string
  post_slug: string
  path: string
  referrer: string
  client_language: string
  client_timezone: string
  viewport_width: number | null
  viewport_height: number | null
  screen_width: number | null
  screen_height: number | null
  client_viewed_at: string
  ip_address: string
  user_agent: string
  cf_ip_country: string
  accept_language: string
  is_bot: number
  is_counted_unique_24h: number
}

type FakeDailyView = {
  post_id: number
  day: string
  human_pv: number
  unique_24h_pv: number
  bot_pv: number
}

const baseInput: RecordBlogPostViewInput = {
  seriesSlug: 'tcp',
  postSlug: 'intro',
  viewId: 'view-1',
  path: '/blogs/tcp/intro',
  referrer: 'https://example.com/',
  clientLanguage: 'zh-CN',
  clientTimezone: 'Asia/Shanghai',
  viewportWidth: 1024,
  viewportHeight: 768,
  screenWidth: 1440,
  screenHeight: 900,
  clientViewedAt: '2026-08-29T00:00:00.000Z',
}

const anonymousHeaders = {
  userAgent: 'Mozilla/5.0',
  cfConnectingIp: '203.0.113.1',
  xForwardedFor: '',
  cfIpCountry: 'US',
  acceptLanguage: 'en-US,en;q=0.9',
}

function createFakeD1({
  cleanupThrows = false,
  events = [],
  posts = [
    {
      id: 1,
      seriesSlug: 'tcp',
      postSlug: 'intro',
      seriesStatus: 'ongoing',
      postStatus: 'published',
    },
  ],
}: {
  cleanupThrows?: boolean
  events?: FakeEvent[]
  posts?: FakePost[]
} = {}) {
  const state = {
    dailyViews: [] as FakeDailyView[],
    events: [...events],
    posts,
  }

  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            first: async <T>() => {
              if (
                sql.includes('FROM blog_series') &&
                sql.includes('INNER JOIN blog_posts')
              ) {
                const seriesSlug = values[0]
                const postSlug = values[1]
                const allowedStatuses = new Set(values.slice(2))
                const post = state.posts.find(
                  (item) =>
                    item.seriesSlug === seriesSlug &&
                    item.postSlug === postSlug &&
                    allowedStatuses.has(item.seriesStatus) &&
                    allowedStatuses.has(item.postStatus),
                )

                return (
                  post
                    ? {
                        id: post.id,
                        series_slug: post.seriesSlug,
                        post_slug: post.postSlug,
                      }
                    : null
                ) as T | null
              }

              if (
                sql.includes('FROM blog_post_view_events') &&
                sql.includes('visitor_key')
              ) {
                const [postId, visitorKey, cutoff] = values as [
                  number,
                  string,
                  number,
                ]
                const event = state.events
                  .filter(
                    (item) =>
                      item.post_id === postId &&
                      item.visitor_key === visitorKey &&
                      item.is_bot === 0 &&
                      item.viewed_at >= cutoff,
                  )
                  .sort((left, right) =>
                    left.viewed_at === right.viewed_at
                      ? left.id - right.id
                      : left.viewed_at - right.viewed_at,
                  )
                  .at(0)

                return (event ? { id: event.id } : null) as T | null
              }

              return null
            },
            run: async () => {
              if (sql.includes('INSERT INTO blog_post_view_events')) {
                const postId = values[0] as number
                const viewId = values[1] as string

                if (
                  state.events.some(
                    (event) =>
                      event.post_id === postId && event.view_id === viewId,
                  )
                ) {
                  throw new Error(
                    'SQLITE_CONSTRAINT: UNIQUE constraint failed: blog_post_view_events.post_id, blog_post_view_events.view_id',
                  )
                }

                const id =
                  Math.max(0, ...state.events.map((event) => event.id)) + 1

                state.events.push({
                  id,
                  post_id: postId,
                  view_id: viewId,
                  visitor_key: values[2] as string,
                  viewer_user_id: values[3] as number | null,
                  viewed_at: values[4] as number,
                  series_slug: values[5] as string,
                  post_slug: values[6] as string,
                  path: values[7] as string,
                  referrer: values[8] as string,
                  client_language: values[9] as string,
                  client_timezone: values[10] as string,
                  viewport_width: values[11] as number | null,
                  viewport_height: values[12] as number | null,
                  screen_width: values[13] as number | null,
                  screen_height: values[14] as number | null,
                  client_viewed_at: values[15] as string,
                  ip_address: values[16] as string,
                  user_agent: values[17] as string,
                  cf_ip_country: values[18] as string,
                  accept_language: values[19] as string,
                  is_bot: values[20] as number,
                  is_counted_unique_24h: 0,
                })

                return { meta: { last_row_id: id }, success: true }
              }

              if (sql.includes('UPDATE blog_post_view_events')) {
                const eventId = values[0] as number
                const event = state.events.find((item) => item.id === eventId)

                if (event) {
                  event.is_counted_unique_24h = 1
                }

                return { success: true }
              }

              if (sql.includes('INSERT INTO blog_post_daily_views')) {
                const [postId, viewedAt, humanPv, uniquePv, botPv] = values as [
                  number,
                  number,
                  number,
                  number,
                  number,
                ]
                const day = new Date(viewedAt * 1000).toISOString().slice(0, 10)
                const dailyView = state.dailyViews.find(
                  (item) => item.post_id === postId && item.day === day,
                )

                if (dailyView) {
                  dailyView.human_pv += humanPv
                  dailyView.unique_24h_pv += uniquePv
                  dailyView.bot_pv += botPv
                } else {
                  state.dailyViews.push({
                    post_id: postId,
                    day,
                    human_pv: humanPv,
                    unique_24h_pv: uniquePv,
                    bot_pv: botPv,
                  })
                }

                return { success: true }
              }

              if (sql.includes('DELETE FROM blog_post_view_events')) {
                if (cleanupThrows) {
                  throw new Error('cleanup failed')
                }

                const cutoff = values[0] as number
                state.events = state.events.filter(
                  (event) => event.viewed_at >= cutoff,
                )

                return { success: true }
              }

              return { success: true }
            },
          }
        },
      }
    },
  } as unknown as D1Database

  return { db, state }
}

describe('validateRecordBlogPostViewInput', () => {
  it('trims strings and normalizes invalid dimensions to null', () => {
    expect(
      validateRecordBlogPostViewInput({
        ...baseInput,
        seriesSlug: ' tcp ',
        postSlug: ' intro ',
        viewId: ' view-1 ',
        path: ' /blogs/tcp/intro?x=1 ',
        viewportWidth: 1024.5,
        screenHeight: -1,
      }),
    ).toEqual({
      ...baseInput,
      seriesSlug: 'tcp',
      postSlug: 'intro',
      viewId: 'view-1',
      path: '/blogs/tcp/intro?x=1',
      viewportWidth: null,
      screenHeight: null,
    })
  })

  it('rejects missing required identifiers', () => {
    expect(() =>
      validateRecordBlogPostViewInput({ ...baseInput, viewId: '   ' }),
    ).toThrow('viewId is required')
  })

  it('rejects identifiers beyond the maximum length', () => {
    expect(() =>
      validateRecordBlogPostViewInput({
        ...baseInput,
        seriesSlug: 'a'.repeat(121),
      }),
    ).toThrow('seriesSlug is too long')
  })
})

describe('request-derived post view helpers', () => {
  it('detects conservative bot user agents', () => {
    expect(isBotUserAgent('')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 Googlebot/2.1')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0')).toBe(false)
  })

  it('uses Cloudflare connecting IP before x-forwarded-for', () => {
    expect(
      getClientIpFromHeaders(
        new Headers({
          'cf-connecting-ip': '203.0.113.10',
          'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        }),
      ),
    ).toBe('203.0.113.10')
  })

  it('falls back to the first forwarded-for IP', () => {
    expect(
      getClientIpFromHeaders(
        new Headers({
          'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        }),
      ),
    ).toBe('198.51.100.1')
  })

  it('builds viewer visitor keys from stable user ids', async () => {
    await expect(
      buildVisitorKey({
        viewer: { id: 42 },
        ipAddress: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
      }),
    ).resolves.toBe('user:42')
  })

  it('hashes anonymous visitor keys', async () => {
    const visitorKey = await buildVisitorKey({
      viewer: null,
      ipAddress: '203.0.113.1',
      userAgent: 'Mozilla/5.0',
    })

    expect(visitorKey).toMatch(/^anon:[a-f0-9]{64}$/)
    expect(visitorKey).not.toContain('203.0.113.1')
    expect(visitorKey).not.toContain('Mozilla')
  })
})

describe('buildVisibleBlogPostForViewQuery', () => {
  it('uses the same number of bindings as placeholders', () => {
    const visibility: ViewerBlogVisibility = {
      seriesStatuses: ['ongoing', 'completed', 'archived'],
      postStatuses: ['published', 'archived'],
    }

    const query = buildVisibleBlogPostForViewQuery({
      visibility,
      seriesSlug: 'tcp',
      postSlug: 'intro',
    })

    expect(query.values).toEqual([
      'tcp',
      'intro',
      'ongoing',
      'completed',
      'archived',
      'published',
      'archived',
    ])
    expect((query.sql.match(/\?/g) ?? []).length).toBe(query.values.length)
  })
})

describe('recordBlogPostViewFromData', () => {
  it('inserts a non-bot event and increments human and unique PVs', async () => {
    const { db, state } = createFakeD1()

    await expect(
      recordBlogPostViewFromData(baseInput, {
        db,
        viewer: null,
        headers: anonymousHeaders,
        now: () => 1_788_000_000,
        shouldCleanup: () => false,
      }),
    ).resolves.toEqual({ ok: true })

    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({
      post_id: 1,
      view_id: 'view-1',
      is_bot: 0,
      is_counted_unique_24h: 1,
      ip_address: '203.0.113.1',
      user_agent: 'Mozilla/5.0',
      cf_ip_country: 'US',
      accept_language: 'en-US,en;q=0.9',
    })
    expect(state.dailyViews).toEqual([
      {
        post_id: 1,
        day: '2026-08-29',
        human_pv: 1,
        unique_24h_pv: 1,
        bot_pv: 0,
      },
    ])
  })

  it('does not increment unique PV for the same visitor within 24 hours', async () => {
    const { db, state } = createFakeD1()

    await recordBlogPostViewFromData(baseInput, {
      db,
      viewer: null,
      headers: anonymousHeaders,
      now: () => 1_788_000_000,
      shouldCleanup: () => false,
    })
    await recordBlogPostViewFromData(
      { ...baseInput, viewId: 'view-2' },
      {
        db,
        viewer: null,
        headers: anonymousHeaders,
        now: () => 1_788_000_060,
        shouldCleanup: () => false,
      },
    )

    expect(state.events.map((event) => event.is_counted_unique_24h)).toEqual([
      1, 0,
    ])
    expect(state.dailyViews[0]).toMatchObject({
      human_pv: 2,
      unique_24h_pv: 1,
      bot_pv: 0,
    })
  })

  it('counts different logged-in users as separate unique visitors', async () => {
    const { db, state } = createFakeD1()

    await recordBlogPostViewFromData(baseInput, {
      db,
      viewer: {
        id: 1,
        username: 'one',
        displayName: 'One',
        role: 'reviewer',
      },
      headers: anonymousHeaders,
      now: () => 1_788_000_000,
      shouldCleanup: () => false,
    })
    await recordBlogPostViewFromData(
      { ...baseInput, viewId: 'view-2' },
      {
        db,
        viewer: {
          id: 2,
          username: 'two',
          displayName: 'Two',
          role: 'reviewer',
        },
        headers: anonymousHeaders,
        now: () => 1_788_000_060,
        shouldCleanup: () => false,
      },
    )

    expect(state.events.map((event) => event.visitor_key)).toEqual([
      'user:1',
      'user:2',
    ])
    expect(state.dailyViews[0]).toMatchObject({
      human_pv: 2,
      unique_24h_pv: 2,
      bot_pv: 0,
    })
  })

  it('increments only bot PV for bot user agents', async () => {
    const { db, state } = createFakeD1()

    await recordBlogPostViewFromData(baseInput, {
      db,
      viewer: null,
      headers: { ...anonymousHeaders, userAgent: 'curl/8.0' },
      now: () => 1_788_000_000,
      shouldCleanup: () => false,
    })

    expect(state.events[0]).toMatchObject({
      is_bot: 1,
      is_counted_unique_24h: 0,
    })
    expect(state.dailyViews[0]).toMatchObject({
      human_pv: 0,
      unique_24h_pv: 0,
      bot_pv: 1,
    })
  })

  it('does not aggregate duplicate view ids for the same post', async () => {
    const { db, state } = createFakeD1()

    await recordBlogPostViewFromData(baseInput, {
      db,
      viewer: null,
      headers: anonymousHeaders,
      now: () => 1_788_000_000,
      shouldCleanup: () => false,
    })

    await expect(
      recordBlogPostViewFromData(baseInput, {
        db,
        viewer: null,
        headers: anonymousHeaders,
        now: () => 1_788_000_060,
        shouldCleanup: () => false,
      }),
    ).resolves.toEqual({ ok: true, duplicate: true })

    expect(state.events).toHaveLength(1)
    expect(state.dailyViews[0]).toMatchObject({
      human_pv: 1,
      unique_24h_pv: 1,
      bot_pv: 0,
    })
  })

  it('allows the same view id for different posts', async () => {
    const { db, state } = createFakeD1({
      posts: [
        {
          id: 1,
          seriesSlug: 'tcp',
          postSlug: 'intro',
          seriesStatus: 'ongoing',
          postStatus: 'published',
        },
        {
          id: 2,
          seriesSlug: 'tcp',
          postSlug: 'runtime',
          seriesStatus: 'ongoing',
          postStatus: 'published',
        },
      ],
    })

    await recordBlogPostViewFromData(baseInput, {
      db,
      viewer: null,
      headers: anonymousHeaders,
      now: () => 1_788_000_000,
      shouldCleanup: () => false,
    })
    await recordBlogPostViewFromData(
      { ...baseInput, postSlug: 'runtime' },
      {
        db,
        viewer: null,
        headers: anonymousHeaders,
        now: () => 1_788_000_060,
        shouldCleanup: () => false,
      },
    )

    expect(state.events.map((event) => event.post_id)).toEqual([1, 2])
    expect(state.dailyViews).toHaveLength(2)
  })

  it('ignores invisible draft posts for anonymous visitors', async () => {
    const { db, state } = createFakeD1({
      posts: [
        {
          id: 1,
          seriesSlug: 'tcp',
          postSlug: 'draft',
          seriesStatus: 'draft',
          postStatus: 'draft',
        },
      ],
    })

    await expect(
      recordBlogPostViewFromData(
        { ...baseInput, postSlug: 'draft' },
        {
          db,
          viewer: null,
          headers: anonymousHeaders,
          now: () => 1_788_000_000,
          shouldCleanup: () => false,
        },
      ),
    ).resolves.toEqual({ ok: true, ignored: true })

    expect(state.events).toHaveLength(0)
    expect(state.dailyViews).toHaveLength(0)
  })

  it('swallows opportunistic cleanup failures after recording', async () => {
    const { db, state } = createFakeD1({ cleanupThrows: true })

    await expect(
      recordBlogPostViewFromData(baseInput, {
        db,
        viewer: null,
        headers: anonymousHeaders,
        now: () => 1_788_000_000,
        shouldCleanup: () => true,
      }),
    ).resolves.toEqual({ ok: true })

    expect(state.events).toHaveLength(1)
    expect(state.dailyViews).toHaveLength(1)
  })
})

describe('deleteOldBlogPostViewEventsFromData', () => {
  it('deletes old events and keeps recent events and aggregates', async () => {
    const { db, state } = createFakeD1({
      events: [
        {
          id: 1,
          post_id: 1,
          view_id: 'old',
          visitor_key: 'anon:old',
          viewer_user_id: null,
          viewed_at: 1_788_000_000 - 31 * 24 * 60 * 60,
          series_slug: 'tcp',
          post_slug: 'intro',
          path: '',
          referrer: '',
          client_language: '',
          client_timezone: '',
          viewport_width: null,
          viewport_height: null,
          screen_width: null,
          screen_height: null,
          client_viewed_at: '',
          ip_address: '',
          user_agent: '',
          cf_ip_country: '',
          accept_language: '',
          is_bot: 0,
          is_counted_unique_24h: 1,
        },
        {
          id: 2,
          post_id: 1,
          view_id: 'new',
          visitor_key: 'anon:new',
          viewer_user_id: null,
          viewed_at: 1_788_000_000 - 29 * 24 * 60 * 60,
          series_slug: 'tcp',
          post_slug: 'intro',
          path: '',
          referrer: '',
          client_language: '',
          client_timezone: '',
          viewport_width: null,
          viewport_height: null,
          screen_width: null,
          screen_height: null,
          client_viewed_at: '',
          ip_address: '',
          user_agent: '',
          cf_ip_country: '',
          accept_language: '',
          is_bot: 0,
          is_counted_unique_24h: 1,
        },
      ],
    })
    state.dailyViews.push({
      post_id: 1,
      day: '2026-08-29',
      human_pv: 10,
      unique_24h_pv: 8,
      bot_pv: 2,
    })

    await expect(
      deleteOldBlogPostViewEventsFromData({
        db,
        now: () => 1_788_000_000,
      }),
    ).resolves.toEqual({ ok: true })

    expect(state.events.map((event) => event.view_id)).toEqual(['new'])
    expect(state.dailyViews).toEqual([
      {
        post_id: 1,
        day: '2026-08-29',
        human_pv: 10,
        unique_24h_pv: 8,
        bot_pv: 2,
      },
    ])
  })
})
