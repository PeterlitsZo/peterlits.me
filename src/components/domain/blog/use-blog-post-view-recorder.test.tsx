import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBlogPostViewRecorder } from './use-blog-post-view-recorder'

const { recordViewMock, useServerFnMock } = vi.hoisted(() => ({
  recordViewMock: vi.fn(),
  useServerFnMock: vi.fn(),
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn(() => ({
    validator: vi.fn(() => ({
      handler: vi.fn(() => 'recordBlogPostView'),
    })),
  })),
  useServerFn: useServerFnMock,
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: vi.fn(),
}))

function Recorder({
  postSlug = 'intro',
  seriesSlug = 'tcp',
}: {
  seriesSlug?: string
  postSlug?: string
}) {
  useBlogPostViewRecorder({ seriesSlug, postSlug })
  return null
}

beforeEach(() => {
  useServerFnMock.mockReturnValue(recordViewMock)
  recordViewMock.mockResolvedValue({ ok: true })
  window.history.pushState({}, '', '/blogs/tcp/intro?ref=home')
  Object.defineProperty(document, 'referrer', {
    configurable: true,
    value: 'https://example.com/start',
  })
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    value: 'zh-CN',
  })
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 768,
  })
  Object.defineProperty(window, 'screen', {
    configurable: true,
    value: { width: 1440, height: 900 },
  })
  Object.defineProperty(crypto, 'randomUUID', {
    configurable: true,
    value: () => 'view-id-1',
  })
  vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
    '2026-08-29T00:00:00.000Z',
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  recordViewMock.mockReset()
  useServerFnMock.mockReset()
})

describe('useBlogPostViewRecorder', () => {
  it('records one page view after mounting', async () => {
    render(<Recorder />)

    await waitFor(() => expect(recordViewMock).toHaveBeenCalledTimes(1))
    expect(recordViewMock).toHaveBeenCalledWith({
      data: {
        seriesSlug: 'tcp',
        postSlug: 'intro',
        viewId: 'view-id-1',
        path: '/blogs/tcp/intro?ref=home',
        referrer: 'https://example.com/start',
        clientLanguage: 'zh-CN',
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewportWidth: 1024,
        viewportHeight: 768,
        screenWidth: 1440,
        screenHeight: 900,
        clientViewedAt: '2026-08-29T00:00:00.000Z',
      },
    })
  })

  it('does not record again on re-render for the same post', async () => {
    const { rerender } = render(<Recorder />)

    await waitFor(() => expect(recordViewMock).toHaveBeenCalledTimes(1))
    rerender(<Recorder />)

    expect(recordViewMock).toHaveBeenCalledTimes(1)
  })

  it('records again when the post slug changes', async () => {
    const { rerender } = render(<Recorder />)

    await waitFor(() => expect(recordViewMock).toHaveBeenCalledTimes(1))
    rerender(<Recorder postSlug="runtime" />)

    await waitFor(() => expect(recordViewMock).toHaveBeenCalledTimes(2))
    expect(recordViewMock).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        seriesSlug: 'tcp',
        postSlug: 'runtime',
      }),
    })
  })
})
