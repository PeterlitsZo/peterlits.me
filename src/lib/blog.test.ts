// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildVisibleBlogSeriesBySlugQuery,
  buildVisibleBlogPostQueries,
  buildVisibleBlogSeriesQuery,
} from './blog'
import type { ViewerBlogVisibility } from './auth'

describe('buildVisibleBlogSeriesQuery', () => {
  it('uses the same number of bindings as placeholders for anonymous viewers', () => {
    const visibility: ViewerBlogVisibility = {
      postStatuses: ['published', 'archived'],
      seriesStatuses: ['ongoing', 'completed', 'archived'],
    }

    const query = buildVisibleBlogSeriesQuery(visibility)

    expect(query.values).toEqual([
      'published',
      'archived',
      'ongoing',
      'completed',
      'archived',
    ])
    expect((query.sql.match(/\?/g) ?? []).length).toBe(query.values.length)
  })
})


describe('buildVisibleBlogSeriesBySlugQuery', () => {
  it('binds post statuses before the slug to match placeholder order', () => {
    const visibility: ViewerBlogVisibility = {
      postStatuses: ['published', 'archived'],
      seriesStatuses: ['ongoing', 'completed', 'archived'],
    }

    const query = buildVisibleBlogSeriesBySlugQuery({
      visibility,
      seriesSlug: 'bash',
    })

    // The correlated subquery (first_post_slug) sits in the SELECT list
    // before the outer WHERE clause, so its post-status placeholders bind
    // first, then the slug, then the outer series-status placeholders.
    expect(query.values).toEqual([
      'published',
      'archived',
      'bash',
      'ongoing',
      'completed',
      'archived',
    ])
    expect((query.sql.match(/\?/g) ?? []).length).toBe(query.values.length)
  })
})

describe('buildVisibleBlogPostQueries', () => {
  it('uses the same number of bindings as placeholders for anonymous viewers', () => {
    const visibility: ViewerBlogVisibility = {
      postStatuses: ['published', 'archived'],
      seriesStatuses: ['ongoing', 'completed', 'archived'],
    }

    const queries = buildVisibleBlogPostQueries({
      visibility,
      seriesId: 1,
      seriesSlug: 'tcp',
      postSlug: 'intro',
    })

    expect(queries.post.values).toEqual([
      'tcp',
      'intro',
      'ongoing',
      'completed',
      'archived',
      'published',
      'archived',
    ])
    expect((queries.post.sql.match(/\?/g) ?? []).length).toBe(
      queries.post.values.length,
    )

    expect(queries.chapters.values).toEqual([1, 'published', 'archived'])
    expect((queries.chapters.sql.match(/\?/g) ?? []).length).toBe(
      queries.chapters.values.length,
    )
  })
})
