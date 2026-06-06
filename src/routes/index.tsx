import { createFileRoute } from '@tanstack/react-router'

import { HomePageView } from '../components/home-page'
import { getVisibleBlogSeries } from '../lib/blog'

export const Route = createFileRoute('/')({
  loader: () => getVisibleBlogSeries(),
  component: Home,
})

function Home() {
  const blogSeries = Route.useLoaderData()

  return <HomePageView blogSeries={blogSeries} />
}
