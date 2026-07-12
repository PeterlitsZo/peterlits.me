import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('generated route tree', () => {
  it('keeps the blog edit route independent from the blog post page', () => {
    const routeTree = readFileSync('src/routeTree.gen.ts', 'utf8')

    expect(routeTree).toContain(
      "import { Route as BlogsSeriesSlugPostSlugEditRouteImport } from './routes/blogs/$seriesSlug/$postSlug_.edit'",
    )
    expect(routeTree).toContain("id: '/blogs/$seriesSlug/$postSlug_/edit'")
    expect(routeTree).toContain("path: '/blogs/$seriesSlug/$postSlug/edit'")
    expect(routeTree).toContain(
      "parentRoute: typeof rootRouteImport",
    )
    expect(routeTree).not.toContain(
      'BlogsSeriesSlugPostSlugRouteChildren',
    )
  })
})
