import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { NewSeriesPageView } from './new-series-page'
import { SiteShell } from './site-shell'

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

function renderPage(onSubmit: (input: unknown) => Promise<unknown>) {
  const rootRoute = createRootRoute({
    component: () => (
      <SiteShell viewer={ownerViewer}>
        <NewSeriesPageView onSubmit={onSubmit} />
      </SiteShell>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  const routeTree = rootRoute.addChildren([indexRoute])
  render(
    <RouterProvider
      router={createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      })}
    />,
  )
}

describe('NewSeriesPageView', () => {
  it('renders the figma title and subtitle', async () => {
    renderPage(() => Promise.resolve({ slug: 'tcp' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '新建系列' }),
    ).toBeTruthy()
    expect(screen.getByText('吸收、沉淀、输出。')).toBeTruthy()
  })

  it('renders the slug input below the title input', async () => {
    renderPage(() => Promise.resolve({ slug: 'tcp' }))

    const titleInput = await screen.findByLabelText('系列名称')
    const slugInput = await screen.findByLabelText('系列链接标识')

    // Title precedes slug in DOM order.
    expect(
      titleInput.compareDocumentPosition(slugInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('disables the submit button while pending', async () => {
    let resolveCreate: (value: unknown) => void = () => {}
    renderPage(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    fireEvent.change(await screen.findByLabelText('系列名称'), {
      target: { value: 'TCP' },
    })
    fireEvent.change(await screen.findByLabelText('系列链接标识'), {
      target: { value: 'tcp' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    const submitButton = await screen.findByRole('button', { name: '新建' })
    expect((submitButton as HTMLButtonElement).disabled).toBe(true)

    resolveCreate({ slug: 'tcp' })
  })

  it('shows an error message when creation fails', async () => {
    renderPage(() => Promise.reject(new Error('该链接标识已被占用，请换一个')))

    fireEvent.change(await screen.findByLabelText('系列名称'), {
      target: { value: 'TCP' },
    })
    fireEvent.change(await screen.findByLabelText('系列链接标识'), {
      target: { value: 'tcp' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '新建' }))

    expect(await screen.findByText('该链接标识已被占用，请换一个')).toBeTruthy()
  })
})
