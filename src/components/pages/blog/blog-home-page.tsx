import { Link } from '@tanstack/react-router'

import type { VisibleBlogSeriesListItem } from '../../../lib/blog-models'
import { PageFrame } from '../../layout/page-frame'
import { PageHeader } from '../../layout/page-header'

function DraftBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F2F4F7] px-2 py-1 text-[12px] leading-none font-medium text-[#475467]">
      草稿
    </span>
  )
}

export function HomePageView({
  blogSeries,
}: {
  blogSeries: VisibleBlogSeriesListItem[]
}) {
  return (
    <PageFrame ariaLabel="博客首页" outerClassName="px-0" testId="home-page">
      <PageHeader
        title="博客"
        subtitle="一些我的碎碎念......"
        titleClassName="text-[40px] text-gray-950 sm:text-[48px]"
        subtitleClassName="text-gray-600"
      />

      <section className="flex flex-col gap-2 px-4 py-6">
        {blogSeries.map((series) => {
          const content = (
            <span className="flex items-center gap-3">
              <span className="block text-[24px] leading-[1.35] font-normal text-black">
                {series.title}
              </span>
              {series.status === 'draft' ? <DraftBadge /> : null}
            </span>
          )

          if (!series.first_post_slug) {
            return (
              <Link
                className="rounded-[6px] px-2 py-1 text-inherit no-underline transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                key={series.slug}
                params={{ seriesSlug: series.slug }}
                to="/blogs/$seriesSlug"
              >
                {content}
              </Link>
            )
          }

          return (
            <Link
              className="rounded-[6px] px-2 py-1 text-inherit no-underline transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              key={series.slug}
              params={{
                seriesSlug: series.slug,
                postSlug: series.first_post_slug,
              }}
              to="/blogs/$seriesSlug/$postSlug"
            >
              {content}
            </Link>
          )
        })}
      </section>
    </PageFrame>
  )
}
