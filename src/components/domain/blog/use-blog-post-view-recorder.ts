import { useEffect, useRef } from 'react'
import { useServerFn } from '@tanstack/react-start'

import { recordBlogPostView } from '../../../lib/post-view-rpc'

function createViewId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

function getClientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}

export function useBlogPostViewRecorder({
  postSlug,
  seriesSlug,
}: {
  seriesSlug: string
  postSlug: string
}) {
  const recordView = useServerFn(recordBlogPostView)
  const sentKeysRef = useRef(new Set<string>())

  useEffect(() => {
    const key = `${seriesSlug}/${postSlug}`

    if (sentKeysRef.current.has(key)) {
      return
    }

    sentKeysRef.current.add(key)

    void recordView({
      data: {
        seriesSlug,
        postSlug,
        viewId: createViewId(),
        path: `${window.location.pathname}${window.location.search}`,
        referrer: document.referrer,
        clientLanguage: navigator.language,
        clientTimezone: getClientTimezone(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        clientViewedAt: new Date().toISOString(),
      },
    }).catch(() => {})
  }, [postSlug, recordView, seriesSlug])
}
