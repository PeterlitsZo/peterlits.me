import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { NewBlogPostPageView } from '../../../components/new-blog-post-page'
import { getViewer } from '../../../lib/auth-rpc'
import { createBlogPost } from '../../../lib/post-rpc'

export const Route = createFileRoute('/blogs/$seriesSlug/new')({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (!viewer || viewer.role !== 'owner') {
      throw redirect({ to: '/' })
    }
  },
  component: NewBlogPostRoute,
})

function NewBlogPostRoute() {
  const { seriesSlug } = Route.useParams()
  const createPost = useServerFn(createBlogPost)

  return (
    <NewBlogPostPageView
      seriesSlug={seriesSlug}
      onSubmit={(input) => createPost({ data: { seriesSlug, ...input } })}
    />
  )
}
