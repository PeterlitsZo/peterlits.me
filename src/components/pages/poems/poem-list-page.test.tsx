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

import { PoemListPageView } from './poem-list-page'
import { SiteShell } from '../../app/site-shell'
import type { VisiblePoemListItem } from '../../../lib/poem-models'
import type { Viewer } from '../../../lib/auth'

const poems: VisiblePoemListItem[] = [
  { id: 1, title: '秋风', content: '风起白云飞' },
  { id: 2, title: '春日', content: '春眠不觉晓' },
  { id: 3, title: '夜思', content: '床前明月光' },
]

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})

function renderPoemsPage({
  viewer = null,
}: {
  viewer?: Viewer | null
} = {}) {
  const rootRoute = createRootRoute({
    component: () => (
      <SiteShell viewer={viewer}>
        <Outlet />
      </SiteShell>
    ),
  })

  const poemsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/poems',
    component: () => <PoemListPageView poems={poems} viewer={viewer} />,
  })

  const newPoemRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/poems/new',
    component: () => null,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })

  const routeTree = rootRoute.addChildren([
    indexRoute,
    poemsRoute,
    newPoemRoute,
  ])

  render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/poems'] }),
      })}
    />,
  )
}

describe('PoemListPageView', () => {
  it('renders the header title and subtitle', async () => {
    renderPoemsPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: '诗集' }),
    ).toBeTruthy()
    expect(screen.getByText('笔墨之间，且听风吟')).toBeTruthy()
  })

  it('renders all poem titles and content', async () => {
    renderPoemsPage()

    expect(await screen.findByText('秋风')).toBeTruthy()
    expect(screen.getByText('风起白云飞')).toBeTruthy()
    expect(screen.getByText('春日')).toBeTruthy()
    expect(screen.getByText('春眠不觉晓')).toBeTruthy()
    expect(screen.getByText('夜思')).toBeTruthy()
    expect(screen.getByText('床前明月光')).toBeTruthy()
  })

  it('renders poems in a responsive masonry list', async () => {
    renderPoemsPage()

    const masonryList = await screen.findByTestId('poem-masonry-list')
    expect(masonryList.contains(screen.getByText('秋风'))).toBe(true)
    expect(masonryList.contains(screen.getByText('春日'))).toBe(true)
    expect(masonryList.contains(screen.getByText('夜思'))).toBe(true)
  })

  it('stretches poem cards to fill their masonry column', async () => {
    renderPoemsPage()

    const title = await screen.findByText('秋风')
    expect(title.closest('article')?.className).toContain('w-full')
  })

  it('does not show the 新建诗 button for anonymous viewers', async () => {
    renderPoemsPage({ viewer: null })

    await screen.findByTestId('poem-list-page')
    expect(screen.queryByRole('link', { name: '新建诗' })).toBeNull()
  })

  it('does not show the 新建诗 button for reviewers', async () => {
    renderPoemsPage({
      viewer: {
        id: 2,
        username: 'rev',
        displayName: 'Rev',
        role: 'reviewer',
      },
    })

    await screen.findByTestId('poem-list-page')
    expect(screen.queryByRole('link', { name: '新建诗' })).toBeNull()
  })

  it('shows the 新建诗 button linking to /poems/new for owners', async () => {
    renderPoemsPage({
      viewer: {
        id: 1,
        username: 'peter',
        displayName: 'Peter',
        role: 'owner',
      },
    })

    const button = await screen.findByRole('link', { name: '新建诗' })
    expect(button.getAttribute('href')).toBe('/poems/new')
  })
})
