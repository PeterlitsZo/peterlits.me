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

  it('renders definition lists as dl, dt, and dd elements', () => {
    const { container } = render(
      <BlogPostMarkdown
        content={[
          'TCP',
          ': 面向连接的传输协议',
          '',
          'UDP',
          ': 无连接的传输协议',
        ].join('\n')}
      />,
    )

    const definitionList = container.querySelector('dl')

    expect(definitionList).toBeTruthy()
    expect(definitionList?.querySelector('dt')?.textContent).toBe('TCP')
    expect(definitionList?.querySelector('dd')?.textContent).toBe(
      '面向连接的传输协议',
    )
    expect(
      Array.from(definitionList?.querySelectorAll('dt') ?? []).map(
        (node) => node.textContent,
      ),
    ).toEqual(['TCP', 'UDP'])
    expect(
      Array.from(definitionList?.querySelectorAll('dd') ?? []).map(
        (node) => node.textContent,
      ),
    ).toEqual(['面向连接的传输协议', '无连接的传输协议'])
  })

  it('merges multiple definitions for one term into a single dd', () => {
    const { container } = render(
      <BlogPostMarkdown
        content={[
          '`block_on`',
          ': 在当前线程上运行一个 future，堵塞直到它完成，并返回解析结果。这个 future 生成的任何其他 task 也都会在对应的运行时上执行。',
          ': 对于本地线程运行时而言，只有 `Runtime::block_on` 方法能驱动 I/O 和计时器驱动。而 `Handle::block_on` 方法无法驱动它们。',
          ': 这个方法会在以下情况下 panic：',
          ': 1. 提供的 future 本身 panic 了。',
          ': 2. 如果它在一个异步上下文中被调用。',
          ': 3. 一个计时器 future 在已被关闭的运行时上运行。',
        ].join('\n')}
      />,
    )

    const definitionList = container.querySelector('dl')
    const definitionTerms = definitionList?.querySelectorAll('dt') ?? []
    const definitionDetails = definitionList?.querySelectorAll('dd') ?? []
    const paragraphs = definitionDetails[0]?.querySelectorAll('p') ?? []
    const orderedList = definitionDetails[0]?.querySelector('ol')

    expect(definitionTerms).toHaveLength(1)
    expect(definitionDetails).toHaveLength(1)
    expect(definitionTerms[0]?.textContent).toBe('block_on')
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[0]?.textContent).toContain('在当前线程上运行一个 future')
    expect(paragraphs[1]?.textContent).toContain('Runtime::block_on')
    expect(paragraphs[2]?.textContent).toBe('这个方法会在以下情况下 panic：')
    expect(orderedList).toBeTruthy()
    expect(
      Array.from(orderedList?.querySelectorAll('li') ?? []).map(
        (node) => node.textContent,
      ),
    ).toEqual([
      '提供的 future 本身 panic 了。',
      '如果它在一个异步上下文中被调用。',
      '一个计时器 future 在已被关闭的运行时上运行。',
    ])
  })
})

describe('BlogPostPageView', () => {
  it('renders a back link to the home page', async () => {
    renderBlogPostPage()

    const backLink = await screen.findByRole('link', { name: '返回' })

    expect(backLink.getAttribute('href')).toBe('/')
  })
})
