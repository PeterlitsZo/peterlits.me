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
  BlogPostChapterList,
  BlogPostMarkdown,
  BlogPostPageView,
  BlogPostSiblingNavigation,
  flattenChapterTree,
  getChapterItems,
  getSiblingPosts,
} from '../../../components/blog-post-page'
import { buildBlogPostChapterTree } from '../../../lib/blog'

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
})

function renderWithRouter(component: () => React.JSX.Element) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const blogRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug/$postSlug',
    component,
  })

  const routeTree = rootRoute.addChildren([blogRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/blogs/tcp/intro'],
    }),
  })

  return render(<RouterProvider router={router} />)
}

function renderBlogPostPage() {
  renderWithRouter(() => (
    <BlogPostPageView
      page={{
        series_slug: 'tcp',
        series_title: '我知道的 TCP',
        series_description: '或者说，大家都知道的 TCP 知识',
        series_status: 'ongoing',
        post_slug: 'intro',
        post_title: 'Runtime',
        post_summary: '从连接语义开始',
        post_content: '## 起步\n\nTCP 是一种面向连接的协议。',
        post_position: 2,
        post_status: 'published',
        chapters: [
          {
            id: 1,
            slug: 'getting-started',
            title: '起步',
            position: 1,
            status: 'published',
            children: [],
          },
          {
            id: 2,
            slug: 'intro',
            title: 'Runtime',
            position: 2,
            status: 'published',
            children: [
              {
                id: 3,
                slug: 'handshake',
                title: '三次握手',
                position: 1,
                status: 'published',
                children: [],
              },
            ],
          },
          {
            id: 4,
            slug: 'timers',
            title: '计时器',
            position: 3,
            status: 'published',
            children: [],
          },
        ],
      }}
    />
  ))
}

describe('buildBlogPostChapterTree', () => {
  it('builds a sorted nested chapter tree and excludes orphaned nodes', () => {
    const tree = buildBlogPostChapterTree([
      {
        id: 4,
        parent_post_id: 2,
        slug: 'tcp-state',
        title: '状态机',
        position: 2,
        status: 'published',
      },
      {
        id: 1,
        parent_post_id: null,
        slug: 'intro',
        title: '起步',
        position: 1,
        status: 'published',
      },
      {
        id: 3,
        parent_post_id: 2,
        slug: 'handshake',
        title: '三次握手',
        position: 1,
        status: 'published',
      },
      {
        id: 5,
        parent_post_id: 999,
        slug: 'orphan',
        title: '孤儿节点',
        position: 1,
        status: 'published',
      },
      {
        id: 2,
        parent_post_id: null,
        slug: 'runtime',
        title: 'Runtime',
        position: 2,
        status: 'published',
      },
    ])

    expect(tree).toEqual([
      {
        id: 1,
        slug: 'intro',
        title: '起步',
        position: 1,
        status: 'published',
        children: [],
      },
      {
        id: 2,
        slug: 'runtime',
        title: 'Runtime',
        position: 2,
        status: 'published',
        children: [
          {
            id: 3,
            slug: 'handshake',
            title: '三次握手',
            position: 1,
            status: 'published',
            children: [],
          },
          {
            id: 4,
            slug: 'tcp-state',
            title: '状态机',
            position: 2,
            status: 'published',
            children: [],
          },
        ],
      },
    ])
  })
})

describe('getChapterItems', () => {
  it('derives nested chapter labels and appends a root-level pending item', () => {
    const items = getChapterItems(
      [
        {
          id: 1,
          slug: 'intro',
          title: '起步',
          position: 1,
          status: 'published',
          children: [],
        },
        {
          id: 2,
          slug: 'runtime',
          title: 'Runtime',
          position: 2,
          status: 'published',
          children: [
            {
              id: 3,
              slug: 'handshake',
              title: '三次握手',
              position: 1,
              status: 'published',
              children: [],
            },
          ],
        },
      ],
      'handshake',
      'ongoing',
    )

    expect(items).toEqual([
      {
        kind: 'post',
        slug: 'intro',
        title: '起步',
        label: '1',
        depth: 0,
        isCurrent: false,
      },
      {
        kind: 'post',
        slug: 'runtime',
        title: 'Runtime',
        label: '2',
        depth: 0,
        isCurrent: false,
      },
      {
        kind: 'post',
        slug: 'handshake',
        title: '三次握手',
        label: '2.1',
        depth: 1,
        isCurrent: true,
      },
      {
        kind: 'pending',
        label: '3',
        depth: 0,
      },
    ])
  })
})

describe('getSiblingPosts', () => {
  it('returns previous and next posts in depth-first display order', () => {
    const siblings = getSiblingPosts(
      [
        {
          id: 1,
          slug: 'intro',
          title: '起步',
          position: 1,
          status: 'published',
          children: [],
        },
        {
          id: 2,
          slug: 'runtime',
          title: 'Runtime',
          position: 2,
          status: 'published',
          children: [
            {
              id: 3,
              slug: 'handshake',
              title: '三次握手',
              position: 1,
              status: 'published',
              children: [],
            },
            {
              id: 4,
              slug: 'tcp-state',
              title: '状态机',
              position: 2,
              status: 'published',
              children: [],
            },
          ],
        },
      ],
      'handshake',
    )

    expect(siblings.previous?.slug).toBe('runtime')
    expect(siblings.next?.slug).toBe('tcp-state')
  })
})

describe('flattenChapterTree', () => {
  it('flattens nested chapters in display order', () => {
    const flattened = flattenChapterTree([
      {
        id: 1,
        slug: 'intro',
        title: '起步',
        position: 1,
        status: 'published',
        children: [],
      },
      {
        id: 2,
        slug: 'runtime',
        title: 'Runtime',
        position: 2,
        status: 'published',
        children: [
          {
            id: 3,
            slug: 'handshake',
            title: '三次握手',
            position: 1,
            status: 'published',
            children: [],
          },
        ],
      },
    ])

    expect(flattened.map((chapter) => chapter.slug)).toEqual([
      'intro',
      'runtime',
      'handshake',
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
    expect(paragraphs[0].textContent).toContain('在当前线程上运行一个 future')
    expect(paragraphs[1].textContent).toContain('Runtime::block_on')
    expect(paragraphs[2].textContent).toBe('这个方法会在以下情况下 panic：')
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

describe('BlogPostChapterList', () => {
  it('renders current, linked, and pending chapter items', async () => {
    renderWithRouter(() => (
      <BlogPostChapterList
        chapterItems={[
          {
            kind: 'post',
            slug: 'intro',
            title: '起步',
            label: '1',
            depth: 0,
            isCurrent: true,
          },
          {
            kind: 'post',
            slug: 'handshake',
            title: '三次握手',
            label: '2.1',
            depth: 1,
            isCurrent: false,
          },
          {
            kind: 'pending',
            label: '3',
            depth: 0,
          },
        ]}
        seriesSlug="tcp"
      />
    ))

    expect((await screen.findByText('起步')).closest('div')).toBeTruthy()
    expect(
      (
        await screen.findByRole('link', {
          name: '2.1三次握手',
        })
      ).getAttribute('href'),
    ).toBe('/blogs/tcp/handshake')
    expect(await screen.findByText('未完待续......')).toBeTruthy()
  })
})

describe('BlogPostSiblingNavigation', () => {
  it('uses a two-column grid so a single sibling card only occupies half width', async () => {
    const { container } = renderWithRouter(() => (
      <BlogPostSiblingNavigation
        next={null}
        previous={{
          id: 1,
          slug: 'getting-started',
          title: '起步',
          position: 1,
          status: 'published',
        }}
        seriesSlug="tcp"
      />
    ))

    const previousLink = await screen.findByRole('link', { name: '上一篇起步' })
    const grid = previousLink.parentElement

    expect(grid?.className).toContain('sm:grid-cols-2')
    expect(previousLink.className).not.toContain('sm:col-span-2')
  })

  it('places a single next card on the right side on larger screens', async () => {
    renderWithRouter(() => (
      <BlogPostSiblingNavigation
        next={{
          id: 4,
          slug: 'timers',
          title: '计时器',
          position: 3,
          status: 'published',
        }}
        previous={null}
        seriesSlug="tcp"
      />
    ))

    const nextLink = await screen.findByRole('link', { name: '下一篇计时器' })

    expect(nextLink.className).toContain('sm:col-start-2')
  })
})

describe('BlogPostPageView', () => {
  it('renders a back link to the home page', async () => {
    renderBlogPostPage()

    const backLink = await screen.findByRole('link', { name: '返回' })

    expect(backLink.getAttribute('href')).toBe('/')
  })

  it('renders previous and next post navigation after the article content', async () => {
    renderBlogPostPage()

    const previousLink = await screen.findByRole('link', {
      name: '上一篇起步',
    })
    const nextLink = await screen.findByRole('link', {
      name: '下一篇三次握手',
    })

    expect(previousLink.getAttribute('href')).toBe('/blogs/tcp/getting-started')
    expect(nextLink.getAttribute('href')).toBe('/blogs/tcp/handshake')
  })

  it('renders nested chapter labels for child posts', async () => {
    renderBlogPostPage()

    expect(await screen.findByText('2')).toBeTruthy()
    expect(await screen.findByText('2.1')).toBeTruthy()
  })

  it('keeps the pending chapter item at the root level after nested children', async () => {
    renderBlogPostPage()

    const nestedLabel = await screen.findByText('2.1')
    const pendingLabel = await screen.findByText('4')

    expect(nestedLabel.compareDocumentPosition(pendingLabel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })
})
