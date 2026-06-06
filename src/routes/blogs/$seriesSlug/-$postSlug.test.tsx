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

import {
  BlogPostMarkdown,
  BlogPostPageView,
  getChapterItems,
} from '../../../components/blog-post-page'

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})

function renderBlogPostPage() {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>首页</div>,
  })

  const blogRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug/$postSlug',
    component: () => (
      <BlogPostPageView
        page={{
          series_slug: 'tcp',
          series_title: '我知道的 TCP',
          series_description: '或者说，大家都知道的 TCP 知识',
          series_status: 'ongoing',
          post_slug: 'intro',
          post_title: '起步',
          post_summary: '从连接语义开始',
          post_content: '## 起步\n\nTCP 是一种面向连接的协议。',
          post_position: 1,
          post_status: 'published',
          chapters: [
            {
              slug: 'intro',
              title: '起步',
              position: 1,
              status: 'published',
            },
          ],
        }}
      />
    ),
  })

  const routeTree = rootRoute.addChildren([indexRoute, blogRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/blogs/tcp/intro'],
    }),
  })

  render(<RouterProvider router={router} />)
}

describe('getChapterItems', () => {
  it('appends a pending item for ongoing series', () => {
    const items = getChapterItems(
      [
        {
          slug: 'intro',
          title: '起步',
          position: 1,
          status: 'published',
        },
      ],
      'intro',
      'ongoing',
    )

    expect(items).toEqual([
      {
        kind: 'post',
        slug: 'intro',
        title: '起步',
        position: 1,
        isCurrent: true,
      },
      {
        kind: 'pending',
        position: 2,
      },
    ])
  })
})

describe('BlogPostMarkdown', () => {
  it('renders markdown content as structured elements', () => {
    render(
      <BlogPostMarkdown
        content={[
          '## 起步',
          '',
          'TCP 是一种面向连接的协议。',
          '',
          '```sh',
          'nc -l4 -p 12345',
          '```',
        ].join('\n')}
      />,
    )

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '起步',
      }),
    ).toBeTruthy()
    expect(screen.getByText('TCP 是一种面向连接的协议。')).toBeTruthy()
    expect(screen.getByText('nc -l4 -p 12345')).toBeTruthy()
  })
})

describe('BlogPostPageView', () => {
  it('renders a back link to the home page', async () => {
    renderBlogPostPage()

    const backLink = await screen.findByRole('link', { name: '返回' })

    expect(backLink.getAttribute('href')).toBe('/')
  })
})
