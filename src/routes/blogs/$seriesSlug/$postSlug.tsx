import { createFileRoute } from '@tanstack/react-router'

import { BlogPostPageView } from '../../../components/blog-post-page'
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
  const page = Route.useLoaderData()
  return <BlogPostPageView page={page} />
}
