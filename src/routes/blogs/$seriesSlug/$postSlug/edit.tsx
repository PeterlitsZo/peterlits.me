import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { NewBlogPostPageView } from '../../../../components/new-blog-post-page'
import { getViewer } from '../../../../lib/auth-rpc'
import { getEditableBlogPost, updateBlogPost } from '../../../../lib/post-rpc'

export const Route = createFileRoute('/blogs/$seriesSlug/$postSlug/edit')({
  beforeLoad: async () => {
    const viewer = await getViewer()
    if (!viewer || viewer.role !== 'owner') {
      throw redirect({ to: '/' })
    }
  },
  loader: ({ params }) =>
    getEditableBlogPost({
      data: {
        seriesSlug: params.seriesSlug,
        postSlug: params.postSlug,
      },
    }),
  component: EditBlogPostRoute,
})

function EditBlogPostRoute() {
  const { seriesSlug, postSlug } = Route.useParams()
  const post = Route.useLoaderData()
  const updatePost = useServerFn(updateBlogPost)

  return (
    <NewBlogPostPageView
      initialContent={post.content}
      initialSlug={post.slug}
      initialTitle={post.title}
      seriesSlug={seriesSlug}
      submitLabel="更新"
      titleText="更新博客"
      onSubmit={(input) =>
        updatePost({ data: { seriesSlug, postSlug, ...input } })
      }
    />
  )
}
