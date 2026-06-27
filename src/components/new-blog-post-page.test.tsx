import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { NewBlogPostPageView } from './new-blog-post-page'
import { SiteShell } from './site-shell'

import type { CreateBlogPostInput } from '../lib/post-rpc'

const ownerViewer = {
  id: 1,
  username: 'peter',
  displayName: 'Peter',
  role: 'owner' as const,
}

beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderPage(
  onSubmit: (input: CreateBlogPostInput) => Promise<{ slug: string }>,
  options: { parentPostSlug?: string } = {},
) {
  const rootRoute = createRootRoute({
    component: () => (
      <SiteShell viewer={ownerViewer}>
        <NewBlogPostPageView
          parentPostSlug={options.parentPostSlug}
          seriesSlug="tcp"
          onSubmit={onSubmit}
        />
      </SiteShell>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/blogs/$seriesSlug/$postSlug',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([indexRoute, postRoute])
  render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      })}
    />,
  )
}

describe('NewBlogPostPageView', () => {
  it('renders the figma title and subtitle', async () => {
    renderPage(() => Promise.resolve({ slug: 'intro' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '新建博客' }),
    ).toBeTruthy()
    expect(screen.getByText('吸收、沉淀、输出。')).toBeTruthy()
  })

  it('renders the slug input between the title and content inputs', async () => {
    renderPage(() => Promise.resolve({ slug: 'intro' }))

    const titleInput = await screen.findByLabelText('博客标题')
    const slugInput = await screen.findByLabelText('博客链接标识')
    const contentInput = await screen.findByLabelText('博客内容')

    // Title precedes slug, slug precedes content in DOM order.
    expect(
      titleInput.compareDocumentPosition(slugInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      slugInput.compareDocumentPosition(contentInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('disables the submit button while pending', async () => {
    let resolveCreate: (value: { slug: string }) => void = () => {}
    renderPage(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    fireEvent.change(await screen.findByLabelText('博客标题'), {
      target: { value: '起步' },
    })
    fireEvent.change(await screen.findByLabelText('博客链接标识'), {
      target: { value: 'intro' },
    })
    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '内容' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    const submitButton = await screen.findByRole('button', { name: '新建' })
    expect((submitButton as HTMLButtonElement).disabled).toBe(true)

    resolveCreate({ slug: 'intro' })
  })

  it('shows an error message when creation fails', async () => {
    renderPage(() => Promise.reject(new Error('该博客标识已被占用，请换一个')))

    fireEvent.change(await screen.findByLabelText('博客标题'), {
      target: { value: '起步' },
    })
    fireEvent.change(await screen.findByLabelText('博客链接标识'), {
      target: { value: 'intro' },
    })
    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '内容' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    expect(await screen.findByText('该博客标识已被占用，请换一个')).toBeTruthy()
  })

  it('calls onSubmit with trimmed title, slug, and content', async () => {
    const calls: CreateBlogPostInput[] = []
    renderPage((input) => {
      calls.push(input)
      return Promise.resolve({ slug: 'intro' })
    })

    fireEvent.change(await screen.findByLabelText('博客标题'), {
      target: { value: '  起步  ' },
    })
    fireEvent.change(await screen.findByLabelText('博客链接标识'), {
      target: { value: ' intro ' },
    })
    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '  内容  ' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    await screen.findByRole('button', { name: '新建' })
    expect(calls).toEqual([{ title: '起步', slug: 'intro', content: '内容' }])
  })

  it('includes the parent post slug when creating a child blog', async () => {
    const calls: CreateBlogPostInput[] = []
    renderPage(
      (input) => {
        calls.push(input)
        return Promise.resolve({ slug: 'data-transfer' })
      },
      { parentPostSlug: 'runtime' },
    )

    fireEvent.change(await screen.findByLabelText('博客标题'), {
      target: { value: '数据传输' },
    })
    fireEvent.change(await screen.findByLabelText('博客链接标识'), {
      target: { value: 'data-transfer' },
    })
    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '内容' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    await screen.findByRole('button', { name: '新建' })
    expect(calls).toEqual([
      {
        title: '数据传输',
        slug: 'data-transfer',
        content: '内容',
        parentPostSlug: 'runtime',
      },
    ])
  })
})
