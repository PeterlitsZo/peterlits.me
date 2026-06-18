import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { NewSeriesPageView } from '../../components/new-series-page'
import { getViewer } from '../../lib/auth-rpc'
import { createBlogSeries } from '../../lib/series-rpc'

export const Route = createFileRoute('/series/new')({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (!viewer || viewer.role !== 'owner') {
      throw redirect({ to: '/' })
    }
  },
  component: NewSeriesRoute,
})

function NewSeriesRoute() {
  const createSeries = useServerFn(createBlogSeries)

  return (
    <NewSeriesPageView
      onSubmit={(input) => createSeries({ data: input })}
    />
  )
}
