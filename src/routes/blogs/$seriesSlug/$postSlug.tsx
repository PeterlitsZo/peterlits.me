import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { BlogPostPageView } from '../../../components/blog-post-page'
import { getViewer } from '../../../lib/auth-rpc'
import { getVisibleBlogPost } from '../../../lib/blog'
import { reorderBlogPosts } from '../../../lib/post-rpc'

export const Route = createFileRoute('/blogs/$seriesSlug/$postSlug')({
  beforeLoad: async () => {
    const viewer = await getViewer()
    return { viewer }
  },
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
  const router = useRouter()
  const page = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const reorderPosts = useServerFn(reorderBlogPosts)

  return (
    <BlogPostPageView
      page={page}
      viewer={viewer}
      onReorder={async (posts) => {
        await reorderPosts({ data: { seriesSlug: page.series_slug, posts } })
        await router.invalidate()
      }}
    />
  )
}
