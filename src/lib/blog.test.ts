// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
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
