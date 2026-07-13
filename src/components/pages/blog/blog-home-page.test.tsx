import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { HomePageView } from './blog-home-page'
import { SiteShell } from '../../app/site-shell'

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

  const seriesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug',
    component: () => null,
  })

  const newSeriesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/series/new',
    component: () => null,
  })

  const routeTree = rootRoute.addChildren([
    indexRoute,
    blogRoute,
    seriesRoute,
    newSeriesRoute,
  ])

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

    // Series without a first post now link to the series overview page.
    const emptySeries = (
      await screen.findByText('浅析 Tokio 异步运行时')
    ).closest('a')
    expect(emptySeries?.getAttribute('href')).toBe('/blogs/tokio')
  })

  it('shows the login button and opens the modal for anonymous viewers', async () => {
    renderHomePage()

    const homeMain = await screen.findByRole('main', { name: '博客首页' })
    const topBar = screen.getByRole('toolbar', { name: '顶部栏' })
    const loginButton = await screen.findByRole('button', { name: '登录' })

    expect(homeMain.className).toContain('bg-white')
    expect(homeMain.className).toContain('max-w-[800px]')
    expect(topBar.parentElement).toBe(homeMain)
    expect(topBar.className).toContain('h-[64px]')
    expect(loginButton.closest('[aria-label="顶部栏"]')).toBe(topBar)
    expect(loginButton.className).toContain('h-6')
    expect(loginButton.className).toContain('rounded-[4px]')
    expect(loginButton.className).toContain('border-0')
    expect(loginButton.className).toContain('bg-[#F3F4F6]')
    expect(loginButton.className).toContain('px-4')
    expect(loginButton.className).toContain('text-[13px]')
    expect(loginButton.className).toContain('leading-[normal]')
    expect(loginButton.className).toContain('font-normal')
    expect(loginButton.className).toContain('text-black')
    expect(loginButton.className).not.toContain('h-7')
    expect(loginButton.className).not.toContain('rounded-[6px]')
    expect(loginButton.className).not.toContain('border-[#E5E7EB]')
    expect(loginButton.className).not.toContain('bg-white')
    expect(loginButton.className).not.toContain('text-[14px]')

    loginButton.click()

    expect(await screen.findByRole('heading', { name: '登录' })).toBeTruthy()
    const dialog = screen.getByRole('dialog', { name: '登录' })
    const overlay = screen.getByTestId('login-modal-overlay')
    const modalLayer = dialog.parentElement
    const submitButton = within(dialog).getByRole('button', { name: '登录' })

    expect(overlay.className).toContain('bg-[#030712]/10')
    expect(overlay.className).not.toContain('bg-transparent')
    expect(modalLayer?.className).toContain('pt-[206px]')
    expect(modalLayer?.className).toContain('items-start')
    expect(modalLayer?.className).toContain('justify-center')
    expect(dialog.className).toContain('max-w-[320px]')
    expect(dialog.className).toContain('rounded-[12px]')
    expect(dialog.className).toContain('border-[#D1D5DB]')
    expect(dialog.className).not.toContain('shadow-')
    expect(submitButton.className).toContain('bg-[#059669]')
    expect(submitButton.className).toContain('text-[16px]')
    expect(screen.getByLabelText('用户名')).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
  })

  it('uses the Figma outer and content backgrounds', async () => {
    renderHomePage()

    const page = await screen.findByTestId('home-page')
    const homeMain = await screen.findByRole('main', { name: '博客首页' })

    expect(page.className).toContain('bg-[#F9FAFB]')
    expect(homeMain.className).toContain('bg-white')
  })

  it('closes the login modal when the overlay is clicked', async () => {
    renderHomePage()

    const loginButton = await screen.findByRole('button', { name: '登录' })
    loginButton.click()

    const overlay = await screen.findByTestId('login-modal-overlay')
    fireEvent.click(overlay)

    expect(screen.queryByRole('heading', { name: '登录' })).toBeNull()
  })

  it('closes the login modal when Escape is pressed', async () => {
    renderHomePage()

    const loginButton = await screen.findByRole('button', { name: '登录' })
    loginButton.click()

    await screen.findByRole('heading', { name: '登录' })
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('heading', { name: '登录' })).toBeNull()
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

    expect(await screen.findByRole('button', { name: '登出' })).toBeTruthy()
    expect(screen.queryByText('Peter')).toBeNull()
  })

  it('renders draft markers for draft series', async () => {
    renderHomePage()

    expect(await screen.findByText('草稿')).toBeTruthy()
  })

  it('shows the 新建系列 entry for owners and links to /series/new', async () => {
    renderHomePage({
      viewer: { displayName: 'Peter', id: 1, role: 'owner', username: 'peter' },
    })
    ;(await screen.findByRole('button', { name: '打开用户菜单' })).click()
    const entry = await screen.findByRole('link', { name: '新建博客系列' })
    expect(entry.getAttribute('href')).toBe('/series/new')
  })

  it('does not show the 新建系列 entry for reviewers', async () => {
    renderHomePage({
      viewer: { displayName: 'Rev', id: 2, role: 'reviewer', username: 'rev' },
    })
    ;(await screen.findByRole('button', { name: '打开用户菜单' })).click()
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('link', { name: '新建博客系列' })).toBeNull()
  })
})
