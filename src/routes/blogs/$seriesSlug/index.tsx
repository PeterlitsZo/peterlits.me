import { createFileRoute, redirect } from '@tanstack/react-router'

import { BlogSeriesPageView } from '../../../components/pages/blog/blog-series-page'
import { getViewer } from '../../../lib/auth-rpc'
import { getVisibleBlogSeriesBySlug } from '../../../lib/blog'

export const Route = createFileRoute('/blogs/$seriesSlug/')({
  beforeLoad: async () => {
    const viewer = await getViewer()
    return { viewer }
  },
  loader: async ({ params }) => {
    const series = await getVisibleBlogSeriesBySlug({
      data: { seriesSlug: params.seriesSlug },
    })

    if (series.first_post_slug) {
      throw redirect({
        to: '/blogs/$seriesSlug/$postSlug',
        params: {
          seriesSlug: params.seriesSlug,
          postSlug: series.first_post_slug,
        },
      })
    }

    return series
  },
  component: BlogSeriesRoute,
})

function BlogSeriesRoute() {
  const series = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()

  return <BlogSeriesPageView series={series} viewer={viewer} />
}
