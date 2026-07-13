import { BookOpen } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import type { VisibleBlogSeriesListItem } from '../../../lib/blog-models'
import type { Viewer } from '../../../lib/auth'
import { PageFrame } from '../../layout/page-frame'
import { PageHeader } from '../../layout/page-header'

export function BlogSeriesPageView({
  series,
  viewer,
}: {
  series: VisibleBlogSeriesListItem
  viewer: Viewer | null
}) {
  const isOwner = viewer?.role === 'owner'

  return (
    <PageFrame ariaLabel={series.title} testId="blog-series-page">
      <PageHeader title={series.title} subtitle={series.description} />

      <section className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24">
        <span className="flex size-24 items-center justify-center rounded-[16px] bg-[#F3F4F6]">
          <BookOpen
            aria-hidden="true"
            className="size-12 text-[#4A5565]"
            strokeWidth={1.5}
          />
        </span>

        {isOwner ? (
          <Link
            className="inline-flex h-8 items-center justify-center rounded-[4px] border-0 bg-[#059669] px-4 text-[14px] leading-[normal] font-normal text-white no-underline transition-opacity hover:opacity-90"
            params={{ seriesSlug: series.slug }}
            to="/blogs/$seriesSlug/new"
          >
            添加新的博客
          </Link>
        ) : null}
      </section>
    </PageFrame>
  )
}
