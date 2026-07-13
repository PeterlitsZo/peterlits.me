import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { NewBlogPostPageView } from '../../../components/pages/blog/blog-post-editor-page'
import { getViewer } from '../../../lib/auth-rpc'
import { createBlogPost } from '../../../lib/post-rpc'

export const Route = createFileRoute('/blogs/$seriesSlug/new')({
  validateSearch: (search: Record<string, unknown>) => ({
    parent: typeof search.parent === 'string' ? search.parent : undefined,
  }),
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
  const { parent } = Route.useSearch()
  const createPost = useServerFn(createBlogPost)

  return (
    <NewBlogPostPageView
      parentPostSlug={parent}
      seriesSlug={seriesSlug}
      onSubmit={(input) => createPost({ data: { seriesSlug, ...input } })}
    />
  )
}
