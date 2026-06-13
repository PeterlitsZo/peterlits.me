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
import { SiteShell } from './site-shell'

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})

function renderHomePage({
  viewer = null,
}: {
  viewer?: {
    displayName: string
    id: number
    role: 'owner' | 'reviewer'
    username: string
  } | null
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
    component: () => (
      <HomePageView
        blogSeries={[
          {
            slug: 'tcp',
            title: '我知道的 TCP',
            description: '一份关于 TCP 的笔记',
            first_post_slug: 'intro',
            status: 'draft',
          },
          {
            slug: 'tokio',
            title: '浅析 Tokio 异步运行时',
            description: 'Tokio 的运行时模型',
            first_post_slug: null,
            status: 'completed',
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

    const linkedSeries = (await screen.findByText('我知道的 TCP')).closest('a')

    expect(linkedSeries?.getAttribute('href')).toBe('/blogs/tcp/intro')
    expect(screen.queryByRole('link', { name: '浅析 Tokio 异步运行时' })).toBeNull()
    expect(screen.getByText('浅析 Tokio 异步运行时')).toBeTruthy()
  })

  it('shows the login button and opens the modal for anonymous viewers', async () => {
    renderHomePage()

    const loginButton = await screen.findByRole('button', { name: '登录' })
    loginButton.click()

    expect(await screen.findByRole('heading', { name: '登录' })).toBeTruthy()
    expect(screen.getByLabelText('用户名')).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
  })

  it('shows the avatar menu for authenticated viewers', async () => {
    renderHomePage({
      viewer: {
        displayName: 'Peter',
        id: 1,
        role: 'owner',
        username: 'peter',
      },
    })

    const avatarButton = await screen.findByRole('button', {
      name: '打开用户菜单',
    })
    avatarButton.click()

    expect(await screen.findByText('Peter')).toBeTruthy()
    expect(screen.getByRole('button', { name: '登出' })).toBeTruthy()
  })

  it('renders draft markers for draft series', async () => {
    renderHomePage()

    expect(await screen.findByText('Draft')).toBeTruthy()
  })
})
