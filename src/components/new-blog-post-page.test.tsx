import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  NewBlogPostPageView,
  buildImageMarkdown,
  insertAtOffset,
} from './new-blog-post-page'
import { SiteShell } from './site-shell'

import type { CreateBlogPostInput } from '../lib/post-rpc'
import type { UploadMediaResult } from '../lib/media-rpc'

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
  options: {
    parentPostSlug?: string
    uploadMediaFn?: (args: { data: FormData }) => Promise<UploadMediaResult>
  } = {},
) {
  const rootRoute = createRootRoute({
    component: () => (
      <SiteShell viewer={ownerViewer}>
        <NewBlogPostPageView
          uploadMediaFn={options.uploadMediaFn}
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

describe('NewBlogPostPageView (update blog)', () => {
  function renderUpdatePage(
    onSubmit: (input: CreateBlogPostInput) => Promise<{ slug: string }>,
    options: {
      initialTitle?: string
      initialSlug?: string
      initialContent?: string
    } = {},
  ) {
    const rootRoute = createRootRoute({
      component: () => (
        <SiteShell viewer={ownerViewer}>
          <NewBlogPostPageView
            initialTitle={options.initialTitle ?? ''}
            initialSlug={options.initialSlug ?? ''}
            initialContent={options.initialContent ?? ''}
            seriesSlug="tcp"
            submitLabel="更新"
            titleText="更新博客"
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

  it('renders the update title and subtitle', async () => {
    renderUpdatePage(() => Promise.resolve({ slug: 'intro' }), {
      initialTitle: '起步',
      initialSlug: 'intro',
      initialContent: '内容',
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: '更新博客' }),
    ).toBeTruthy()
    expect(screen.getByText('吸收、沉淀、输出。')).toBeTruthy()
  })

  it('prefills the inputs with the initial values', async () => {
    renderUpdatePage(() => Promise.resolve({ slug: 'intro' }), {
      initialTitle: '起步',
      initialSlug: 'intro',
      initialContent: '正文内容',
    })

    expect((await screen.findByLabelText('博客标题')).value).toBe('起步')
    expect(screen.getByLabelText('博客链接标识').value).toBe('intro')
    expect(screen.getByLabelText('博客内容').value).toBe('正文内容')
  })

  it('renders the update submit button label', async () => {
    renderUpdatePage(() => Promise.resolve({ slug: 'intro' }), {
      initialTitle: '起步',
      initialSlug: 'intro',
      initialContent: '内容',
    })

    expect(await screen.findByRole('button', { name: '更新' })).toBeTruthy()
  })

  it('calls onSubmit with trimmed title, slug, and content without parentPostSlug', async () => {
    const calls: CreateBlogPostInput[] = []
    renderUpdatePage(
      (input) => {
        calls.push(input)
        return Promise.resolve({ slug: 'handshake' })
      },
      {
        initialTitle: ' 起步 ',
        initialSlug: 'intro',
        initialContent: ' 内容 ',
      },
    )

    fireEvent.change(await screen.findByLabelText('博客标题'), {
      target: { value: '  握手  ' },
    })
    fireEvent.change(await screen.findByLabelText('博客链接标识'), {
      target: { value: ' handshake ' },
    })
    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '  正文  ' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '更新' }))

    await screen.findByRole('button', { name: '更新' })
    expect(calls).toEqual([
      { title: '握手', slug: 'handshake', content: '正文' },
    ])
  })

  it('shows an error message when update fails', async () => {
    renderUpdatePage(() =>
      Promise.reject(new Error('该博客标识已被占用，请换一个')),
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
    fireEvent.click(await screen.findByRole('button', { name: '更新' }))

    expect(await screen.findByText('该博客标识已被占用，请换一个')).toBeTruthy()
  })
})

describe('NewBlogPostPageView image drop', () => {
  function pngFile(name = 'photo.png', content = 'png-bytes') {
    return new File([content], name, { type: 'image/png' })
  }

  function dropImage(file: File) {
    const content = screen.getByLabelText('博客内容')
    fireEvent.drop(content, {
      dataTransfer: { files: [file] } as unknown as DataTransfer,
    })
  }

  it('uploads a dropped image and inserts its markdown at the drop point', async () => {
    let receivedFile: File | null = null
    renderPage(() => Promise.resolve({ slug: 'intro' }), {
      uploadMediaFn: async ({ data }) => {
        receivedFile = data.get('file') as File
        return {
          url: 'https://static.peterlits.me/2026/07/abc.png',
          alt: 'screenshot',
        }
      },
    })

    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '开头' },
    })
    dropImage(pngFile('screenshot.png'))

    const content = screen.getByLabelText('博客内容')
    await waitFor(() => {
      expect(content.value).toContain(
        '![screenshot](https://static.peterlits.me/2026/07/abc.png)',
      )
    })
    expect(receivedFile).toBeInstanceOf(File)
  })

  it('removes the placeholder and shows an error when upload fails', async () => {
    renderPage(() => Promise.resolve({ slug: 'intro' }), {
      uploadMediaFn: async () => {
        throw new Error('图片上传失败，请稍后再试')
      },
    })

    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '正文' },
    })
    dropImage(pngFile('broken.png'))

    const content = screen.getByLabelText('博客内容')
    await waitFor(() => {
      expect(content.value).not.toContain('uploading')
    })
    expect(content.value).not.toContain('broken')
    expect(await screen.findByText('图片上传失败，请稍后再试')).toBeTruthy()
  })

  it('does not upload non-image drops', async () => {
    let called = false
    renderPage(() => Promise.resolve({ slug: 'intro' }), {
      uploadMediaFn: async () => {
        called = true
        return { url: '', alt: '' }
      },
    })

    fireEvent.change(await screen.findByLabelText('博客内容'), {
      target: { value: '原文' },
    })
    dropImage(new File(['x'], 'doc.pdf', { type: 'application/pdf' }))

    const content = screen.getByLabelText('博客内容')
    // Non-image drops are ignored synchronously: content must stay unchanged.
    expect(called).toBe(false)
    await waitFor(() => {
      expect(content.value).toBe('原文')
    })
  })
})

describe('buildImageMarkdown', () => {
  it('wraps alt and url in markdown image syntax', () => {
    expect(buildImageMarkdown('cat', 'https://x/y.png')).toBe(
      '![cat](https://x/y.png)',
    )
  })

  it('escapes brackets in the alt text so it cannot break the syntax', () => {
    expect(buildImageMarkdown('a [b] c', 'https://x/y.png')).toBe(
      '![a \\[b\\] c](https://x/y.png)',
    )
  })
})

describe('insertAtOffset', () => {
  it('inserts a snippet at the given offset and returns the caret end', () => {
    expect(insertAtOffset('abc', 1, 'X')).toEqual({ text: 'aXbc', caret: 2 })
  })

  it('clamps an offset beyond the text length', () => {
    expect(insertAtOffset('abc', 99, 'X')).toEqual({ text: 'abcX', caret: 4 })
  })

  it('clamps a negative offset to the start', () => {
    expect(insertAtOffset('abc', -1, 'X')).toEqual({ text: 'Xabc', caret: 1 })
  })
})
