import { ChevronLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type {
  VisibleBlogPostChapter,
  VisibleBlogPostPageData,
} from '../lib/blog'
import remarkDefinitionList from '../lib/remark-definition-list'

type ChapterItem =
  | {
      kind: 'post'
      slug: string
      title: string
      position: number
      isCurrent: boolean
    }
  | {
      kind: 'pending'
      position: number
    }

export function getChapterItems(
  chapters: VisibleBlogPostChapter[],
  currentSlug: string,
  seriesStatus: VisibleBlogPostPageData['series_status'],
): ChapterItem[] {
  const items: ChapterItem[] = chapters.map((chapter) => ({
    kind: 'post',
    slug: chapter.slug,
    title: chapter.title,
    position: chapter.position,
    isCurrent: chapter.slug === currentSlug,
  }))

  if (seriesStatus === 'ongoing') {
    items.push({
      kind: 'pending',
      position: (chapters.at(-1)?.position ?? 0) + 1,
    })
  }

  return items
}

export function BlogPostMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkDefinitionList]}>
      {content}
    </ReactMarkdown>
  )
}

export function BlogPostPageView({ page }: { page: VisibleBlogPostPageData }) {
  const chapterItems = getChapterItems(
    page.chapters,
    page.post_slug,
    page.series_status,
  )

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6">
      <article className="mx-auto flex w-full max-w-[800px] flex-col sm:border-x border-gray-100 bg-white">
        <div className="flex items-center gap-3 px-6 py-[18px]">
          <Link
            className="flex items-center gap-3 text-black no-underline transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
            to="/"
          >
            <span className="flex size-6 items-center justify-center rounded-[4px] bg-gray-50">
              <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
            </span>
            <span className="text-[16px] leading-none font-normal">返回</span>
          </Link>
        </div>

        <header className="flex min-h-[300px] flex-col justify-end px-6 py-6">
          <h1 className="text-[40px] leading-none font-normal text-gray-950 sm:text-[48px]">
            {page.series_title}
          </h1>
          <p className="mt-2 text-[24px] leading-none font-normal text-gray-600">
            {page.series_description}
          </p>
        </header>

        <section className="p-6">
          <div className="flex w-full max-w-[500px] flex-col items-start gap-1.5 overflow-hidden rounded-[12px] bg-gray-50 p-3">
            {chapterItems.map((item) => {
              const isCurrent = item.kind === 'post' && item.isCurrent
              const numberClassName = isCurrent
                ? 'bg-gray-950 text-white'
                : 'bg-gray-600 text-white'
              const titleClassName = isCurrent
                ? 'text-gray-950'
                : 'text-gray-600'

              const content =
                item.kind === 'post' ? (
                  <>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-[12px] text-[16px] leading-none ${numberClassName}`}
                    >
                      {item.position}
                    </span>
                    <span
                      className={`shrink-0 whitespace-nowrap text-[20px] leading-[24px] font-normal ${titleClassName}`}
                    >
                      {item.title}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-[12px] bg-gray-600 text-[16px] leading-none text-white">
                      {item.position}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[20px] leading-[24px] font-normal text-gray-600">
                      未完待续......
                    </span>
                  </>
                )

              if (item.kind === 'post' && !item.isCurrent) {
                return (
                  <Link
                    className="flex w-full items-center gap-1.5 overflow-hidden rounded-[6px] px-1.5 py-1.5 no-underline"
                    key={item.slug}
                    params={{
                      postSlug: item.slug,
                      seriesSlug: page.series_slug,
                    }}
                    to="/blogs/$seriesSlug/$postSlug"
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <div
                  className="flex w-full items-center gap-1.5 overflow-hidden rounded-[6px] px-1.5 py-1.5"
                  key={item.kind === 'post' ? item.slug : 'pending'}
                >
                  {content}
                </div>
              )
            })}
          </div>
        </section>

        <section className="px-6 pb-[120px] pt-6">
          <div className="markdown-body w-full max-w-none text-black">
            <BlogPostMarkdown content={page.post_content} />
          </div>
        </section>
      </article>
    </div>
  )
}
