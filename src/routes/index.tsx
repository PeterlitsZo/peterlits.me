import { Link, createFileRoute } from '@tanstack/react-router'

import { getVisibleBlogSeries } from '../lib/blog'

export const Route = createFileRoute('/')({
  loader: () => getVisibleBlogSeries(),
  component: Home,
})

function Home() {
  const blogSeries = Route.useLoaderData()

  return (
    <ul>
      {blogSeries.map((series) => (
        <li key={series.slug}>
          {series.first_post_slug ? (
            <Link
              to="/blogs/$seriesSlug/$postSlug"
              params={{
                seriesSlug: series.slug,
                postSlug: series.first_post_slug,
              }}
            >
              {series.title}
            </Link>
          ) : (
            series.title
          )}
        </li>
      ))}
    </ul>
  )
}
