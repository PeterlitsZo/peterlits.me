import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { BlogSeriesPageView } from './blog-series-page'
import { SiteShell } from './site-shell'
import type { VisibleBlogSeriesListItem } from '../lib/blog-models'
import type { Viewer } from '../lib/auth'

const tcpSeries: VisibleBlogSeriesListItem = {
  slug: 'tcp',
  title: '我知道的 TCP',
  description: '或者说，大家都知道的 TCP 知识',
  first_post_slug: null,
  status: 'draft',
}

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})

function renderSeriesPage({
  viewer = null,
  series = tcpSeries,
}: {
  viewer?: Viewer | null
  series?: VisibleBlogSeriesListItem
} = {}) {
  const rootRoute = createRootRoute({
    component: () => (
      <SiteShell viewer={viewer}>
        <Outlet />
      </SiteShell>
    ),
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })

  const seriesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug',
    component: () => <BlogSeriesPageView series={series} viewer={viewer} />,
  })

  const newPostRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug/new',
    component: () => null,
  })

  const routeTree = rootRoute.addChildren([
    indexRoute,
    seriesRoute,
    newPostRoute,
  ])

  render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({
          initialEntries: ['/blogs/tcp'],
        }),
      })}
    />,
  )
}

describe('BlogSeriesPageView', () => {
  it('renders the series title and description in the header', async () => {
    renderSeriesPage()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '我知道的 TCP',
      }),
    ).toBeTruthy()
    expect(screen.getByText('或者说，大家都知道的 TCP 知识')).toBeTruthy()
  })

  it('renders a back link to the home page', async () => {
    renderSeriesPage()

    const backLink = await screen.findByRole('link', { name: '返回' })

    expect(backLink.getAttribute('href')).toBe('/')
  })

  it('renders the empty-state BookOpen icon', async () => {
    renderSeriesPage()

    expect(await screen.findByTestId('blog-series-page')).toBeTruthy()
    // lucide renders an svg with the lucide-book-open aria label fallback.
    const svg = document.querySelector('svg.lucide-book-open')
    expect(svg).toBeTruthy()
  })

  it('shows the 添加新的博客 button linking to /blogs/$seriesSlug/new for owners', async () => {
    renderSeriesPage({
      viewer: { id: 1, username: 'peter', displayName: 'Peter', role: 'owner' },
    })

    const button = await screen.findByRole('link', {
      name: '添加新的博客',
    })

    expect(button.getAttribute('href')).toBe('/blogs/tcp/new')
  })

  it('does not show the 添加新的博客 button for reviewers', async () => {
    renderSeriesPage({
      viewer: {
        id: 2,
        username: 'rev',
        displayName: 'Rev',
        role: 'reviewer',
      },
    })

    await screen.findByTestId('blog-series-page')
    expect(screen.queryByRole('link', { name: '添加新的博客' })).toBeNull()
  })

  it('does not show the 添加新的博客 button for anonymous viewers', async () => {
    renderSeriesPage({ viewer: null })

    await screen.findByTestId('blog-series-page')
    expect(screen.queryByRole('link', { name: '添加新的博客' })).toBeNull()
  })
})
