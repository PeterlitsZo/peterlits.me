import { Link } from '@tanstack/react-router'

import type { VisibleBlogSeriesListItem } from '../../../lib/blog-models'
import { AuthTopBar } from '../../site-shell'

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
    <div className="min-h-screen bg-[#F9FAFB] px-0" data-testid="home-page">
      <main
        aria-label="博客首页"
        className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col overflow-clip border-x border-[#F3F4F6] bg-white"
      >
        <AuthTopBar />
        <header className="flex h-[300px] shrink-0 flex-col justify-end overflow-clip p-6">
          <h1 className="text-[40px] leading-none font-normal text-gray-950 sm:text-[48px]">
            博客
          </h1>
          <p className="mt-2 text-[24px] leading-none font-normal text-gray-600">
            一些我的碎碎念......
          </p>
        </header>

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
        <div className="min-h-0 flex-1" />
      </main>
    </div>
  )
}
