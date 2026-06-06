import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { HomePageView } from './home-page'

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})

function renderHomePage() {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <HomePageView
        blogSeries={[
          {
            slug: 'tcp',
            title: '我知道的 TCP',
            description: '一份关于 TCP 的笔记',
            first_post_slug: 'intro',
          },
          {
            slug: 'tokio',
            title: '浅析 Tokio 异步运行时',
            description: 'Tokio 的运行时模型',
            first_post_slug: null,
          },
        ]}
      />
    ),
  })

  const blogRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug/$postSlug',
    component: () => (
      <Link
        params={{
          postSlug: 'intro',
          seriesSlug: 'tcp',
        }}
        to="/blogs/$seriesSlug/$postSlug"
      >
        占位
      </Link>
    ),
  })

  const routeTree = rootRoute.addChildren([indexRoute, blogRoute])

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/'],
    }),
  })

  render(<RouterProvider router={router} />)
}

describe('HomePageView', () => {
  it('renders the figma-inspired heading and series list', async () => {
    renderHomePage()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '博客',
      }),
    ).toBeTruthy()
    expect(screen.getByText('一些我的碎碎念......')).toBeTruthy()
    expect(screen.getByText('我知道的 TCP')).toBeTruthy()
    expect(screen.getByText('浅析 Tokio 异步运行时')).toBeTruthy()
  })

  it('keeps navigable series as links and static series as plain text', async () => {
    renderHomePage()

    const linkedSeries = await screen.findByRole('link', {
      name: '我知道的 TCP',
    })

    expect(linkedSeries.getAttribute('href')).toBe('/blogs/tcp/intro')
    expect(screen.queryByRole('link', { name: '浅析 Tokio 异步运行时' })).toBeNull()
    expect(screen.getByText('浅析 Tokio 异步运行时')).toBeTruthy()
  })
})
