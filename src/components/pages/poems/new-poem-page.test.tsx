import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { NewPoemPageView } from './new-poem-page'
import { SiteShell } from '../../app/site-shell'

import type { CreatePoemInput } from '../../../lib/poem-rpc'

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
  onSubmit: (input: CreatePoemInput) => Promise<{ id: number }>,
) {
  const rootRoute = createRootRoute({
    component: () => (
      <SiteShell viewer={ownerViewer}>
        <NewPoemPageView onSubmit={onSubmit} />
      </SiteShell>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  const poemsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/poems',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([indexRoute, poemsRoute])
  render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      })}
    />,
  )
}

describe('NewPoemPageView', () => {
  it('renders the figma title and subtitle', async () => {
    renderPage(() => Promise.resolve({ id: 1 }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '新建诗' }),
    ).toBeTruthy()
    expect(screen.getByText('笔墨之间，且听风吟。')).toBeTruthy()
  })

  it('renders the content input below the title input', async () => {
    renderPage(() => Promise.resolve({ id: 1 }))

    const titleInput = await screen.findByLabelText('诗名')
    const contentInput = await screen.findByLabelText('正文')

    expect(
      titleInput.compareDocumentPosition(contentInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('disables the submit button while pending', async () => {
    let resolveCreate: (value: { id: number }) => void = () => {}
    renderPage(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    fireEvent.change(await screen.findByLabelText('诗名'), {
      target: { value: '秋风' },
    })
    fireEvent.change(await screen.findByLabelText('正文'), {
      target: { value: '风起白云飞' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    const submitButton = await screen.findByRole('button', { name: '新建' })
    expect((submitButton as HTMLButtonElement).disabled).toBe(true)

    resolveCreate({ id: 1 })
  })

  it('shows an error message when creation fails', async () => {
    renderPage(() => Promise.reject(new Error('没有权限执行此操作')))

    fireEvent.change(await screen.findByLabelText('诗名'), {
      target: { value: '秋风' },
    })
    fireEvent.change(await screen.findByLabelText('正文'), {
      target: { value: '风起白云飞' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    expect(await screen.findByText('没有权限执行此操作')).toBeTruthy()
  })
})
