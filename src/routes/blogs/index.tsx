import { createFileRoute } from '@tanstack/react-router'

import { BlogHomePageView } from '../../components/pages/blog/blog-home-page'
import { getVisibleBlogSeries } from '../../lib/blog'

export const Route = createFileRoute('/blogs/')({
  loader: () => getVisibleBlogSeries(),
  component: BlogsIndex,
})

function BlogsIndex() {
  const blogSeries = Route.useLoaderData()

  return <BlogHomePageView blogSeries={blogSeries} />
}
