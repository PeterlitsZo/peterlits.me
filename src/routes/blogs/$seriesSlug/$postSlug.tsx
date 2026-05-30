import { createFileRoute } from '@tanstack/react-router'

import { getVisibleBlogPost } from '../../../lib/blog'

export const Route = createFileRoute('/blogs/$seriesSlug/$postSlug')({
  loader: ({ params }) =>
    getVisibleBlogPost({
      data: {
        seriesSlug: params.seriesSlug,
        postSlug: params.postSlug,
      },
    }),
  component: BlogPostPage,
})

function BlogPostPage() {
  const post = Route.useLoaderData()

  return (
    <article>
      <h1>{post.post_title}</h1>
      <p>{post.series_title}</p>
      <pre>{post.post_content}</pre>
    </article>
  )
}
