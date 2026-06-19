import { BookOpen, ChevronLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import type { VisibleBlogSeriesListItem } from '../lib/blog-models'
import type { Viewer } from '../lib/auth'
import { AuthTopBar } from './site-shell'

export function BlogSeriesPageView({
  series,
  viewer,
}: {
  series: VisibleBlogSeriesListItem
  viewer: Viewer | null
}) {
  const isOwner = viewer?.role === 'owner'

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="blog-series-page">
      <main
        aria-label={series.title}
        className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col overflow-clip border-x border-[#F3F4F6] bg-white"
      >
        <AuthTopBar
          leading={
            <Link
              className="flex items-center gap-3 text-black no-underline transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
              to="/"
            >
              <span className="flex size-6 items-center justify-center rounded-[4px] bg-gray-100">
                <ChevronLeft
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.75}
                />
              </span>
              <span className="text-[16px] leading-none font-normal">返回</span>
            </Link>
          }
        />

        <header className="flex h-[300px] shrink-0 flex-col justify-end overflow-clip p-6">
          <h1 className="text-[48px] leading-none font-normal text-[#030712]">
            {series.title}
          </h1>
          <p className="mt-2 text-[24px] leading-none font-normal text-[#4A5565]">
            {series.description}
          </p>
        </header>

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

        <div className="min-h-0 flex-1" />
      </main>
    </div>
  )
}
