import type { Viewer } from '../../../lib/auth'
import type { VisibleBlogPostPageData } from '../../../lib/blog-models'
import { AuthTopBar } from '../../app/auth-top-bar'
import {
  BlogPostChapterList,
  BlogPostSiblingNavigation,
  StatusBadge,
  getChapterItems,
  getSiblingPosts,
} from '../../domain/blog/blog-chapters'
import type { ReorderBlogPostPayloadItem } from '../../domain/blog/blog-chapters'
import { BlogPostMarkdown } from '../../domain/blog/blog-post-markdown'

export function BlogPostPageView({
  onReorder,
  page,
  viewer = null,
}: {
  onReorder?: (posts: ReorderBlogPostPayloadItem[]) => Promise<void>
  page: VisibleBlogPostPageData
  viewer?: Viewer | null
}) {
  const isOwner = viewer?.role === 'owner'
  const chapterItems = getChapterItems(
    page.chapters,
    page.post_slug,
    page.series_status,
  )
  const siblingPosts = getSiblingPosts(page.chapters, page.post_slug)

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6">
      <article className="mx-auto flex w-full max-w-[800px] flex-col border-gray-100 bg-white sm:border-x">
        <AuthTopBar />

        <header className="flex min-h-[300px] flex-col justify-end px-6 py-6">
          <div className="flex items-center gap-3">
            <h1 className="text-[40px] leading-none font-normal text-gray-950 sm:text-[48px]">
              {page.series_title}
            </h1>
            <StatusBadge label="系列草稿" status={page.series_status} />
          </div>
          <p className="mt-2 text-[24px] leading-none font-normal text-gray-600">
            {page.series_description}
          </p>
        </header>

        <section className="p-6">
          <BlogPostChapterList
            chapterItems={chapterItems}
            chapters={page.chapters}
            isOwner={isOwner}
            onReorder={onReorder}
            seriesSlug={page.series_slug}
          />
        </section>

        <section className="px-6 pt-6 pb-[120px]">
          <div className="markdown-body w-full max-w-none text-black">
            <BlogPostMarkdown content={page.post_content} />
          </div>
          <div className="mt-12">
            <BlogPostSiblingNavigation
              next={siblingPosts.next}
              previous={siblingPosts.previous}
              seriesSlug={page.series_slug}
            />
          </div>
        </section>
      </article>
    </div>
  )
}
