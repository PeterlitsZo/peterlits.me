import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import type {
  BlogPostStatus,
  BlogSeriesStatus,
  VisibleBlogPostChapterNode,
  VisibleBlogPostPageData,
} from '../lib/blog-models'
import remarkAdmonition from '../lib/remark-admonition'
import remarkDefinitionList from '../lib/remark-definition-list'
import { AuthTopBar } from './site-shell'

type FlatChapter = Omit<VisibleBlogPostChapterNode, 'children'>

type ChapterItem =
  | {
      kind: 'post'
      slug: string
      title: string
      label: string
      depth: number
      isCurrent: boolean
      status: BlogPostStatus
    }
  | {
      kind: 'pending'
      label: string
      depth: number
    }

export function flattenChapterTree(
  chapters: VisibleBlogPostChapterNode[],
): FlatChapter[] {
  const flattened: FlatChapter[] = []

  for (const chapter of chapters) {
    const { children: _, ...flatChapter } = chapter
    flattened.push(flatChapter)
    flattened.push(...flattenChapterTree(chapter.children))
  }

  return flattened
}

function buildChapterItems(
  chapters: VisibleBlogPostChapterNode[],
  currentSlug: string,
  parentLabel: string,
  depth: number,
): ChapterItem[] {
  return chapters.flatMap((chapter) => {
    const label = parentLabel
      ? `${parentLabel}.${chapter.position}`
      : String(chapter.position)

    return [
      {
        kind: 'post' as const,
        slug: chapter.slug,
        title: chapter.title,
        label,
        depth,
        isCurrent: chapter.slug === currentSlug,
        status: chapter.status,
      },
      ...buildChapterItems(chapter.children, currentSlug, label, depth + 1),
    ]
  })
}

function DraftBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F2F4F7] px-2 py-1 text-[12px] leading-none font-medium text-[#475467]">
      {children}
    </span>
  )
}

function StatusBadge({
  label,
  status,
}: {
  label: string
  status: BlogPostStatus | BlogSeriesStatus
}) {
  if (status !== 'draft') {
    return null
  }

  return <DraftBadge>{label}</DraftBadge>
}

export function getChapterItems(
  chapters: VisibleBlogPostChapterNode[],
  currentSlug: string,
  seriesStatus: VisibleBlogPostPageData['series_status'],
): ChapterItem[] {
  const items = buildChapterItems(chapters, currentSlug, '', 0)

  if (seriesStatus === 'ongoing') {
    items.push({
      kind: 'pending',
      label: String((chapters.at(-1)?.position ?? 0) + 1),
      depth: 0,
    })
  }

  return items
}

export function getSiblingPosts(
  chapters: VisibleBlogPostChapterNode[],
  currentSlug: string,
) {
  const flattened = flattenChapterTree(chapters)
  const currentIndex = flattened.findIndex(
    (chapter) => chapter.slug === currentSlug,
  )

  if (currentIndex === -1) {
    return {
      previous: null,
      next: null,
    }
  }

  return {
    previous: flattened[currentIndex - 1] ?? null,
    next: flattened[currentIndex + 1] ?? null,
  }
}

export function BlogPostMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[
        remarkGfm,
        remarkMath,
        remarkAdmonition,
        remarkDefinitionList,
      ]}
    >
      {content}
    </ReactMarkdown>
  )
}

export function BlogPostChapterList({
  chapterItems,
  seriesSlug,
}: {
  chapterItems: ChapterItem[]
  seriesSlug: string
}) {
  const numberBaseClassName =
    'flex size-[22px] shrink-0 items-center justify-center rounded-[8px] text-[13px] leading-none font-normal tracking-[-0.65px] text-white'
  const titleBaseClassName =
    'shrink-0 whitespace-nowrap text-[20px] leading-[24px] font-normal'

  return (
    <div className="flex w-full max-w-[500px] flex-col items-start gap-1.5 overflow-hidden rounded-[12px] bg-gray-50 p-3">
      {chapterItems.map((item) => {
        const isCurrent = item.kind === 'post' && item.isCurrent
        const numberClassName = isCurrent
          ? 'bg-gray-950 text-white'
          : 'bg-gray-500 text-white'
        const titleClassName = isCurrent ? 'text-gray-950' : 'text-gray-500'
        const paddingLeft = `${6 + item.depth * 26}px`

        const content =
          item.kind === 'post' ? (
            <>
              <span className={`${numberBaseClassName} ${numberClassName}`}>
                {item.label}
              </span>
              <span
                className={`flex min-w-0 items-center gap-2 ${titleBaseClassName} ${titleClassName}`}
              >
                <span className="truncate">{item.title}</span>
                <StatusBadge label="草稿" status={item.status} />
              </span>
            </>
          ) : (
            <>
              <span className={`${numberBaseClassName} bg-gray-500`}>
                {item.label}
              </span>
              <span className={`${titleBaseClassName} text-gray-500`}>
                未完待续......
              </span>
            </>
          )

        if (item.kind === 'post' && !item.isCurrent) {
          return (
            <Link
              className="flex w-full items-center gap-1.5 overflow-hidden rounded-[6px] py-1.5 pr-1.5 no-underline hover:bg-gray-100"
              key={item.slug}
              params={{
                postSlug: item.slug,
                seriesSlug,
              }}
              style={{ paddingLeft }}
              to="/blogs/$seriesSlug/$postSlug"
            >
              {content}
            </Link>
          )
        }

        return (
          <div
            className="flex w-full items-center gap-1.5 overflow-hidden rounded-[6px] py-1.5 pr-1.5"
            key={item.kind === 'post' ? item.slug : 'pending'}
            style={{ paddingLeft }}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}

export function BlogPostSiblingNavigation({
  next,
  previous,
  seriesSlug,
}: {
  next: FlatChapter | null
  previous: FlatChapter | null
  seriesSlug: string
}) {
  if (!previous && !next) {
    return null
  }

  const cardClassName =
    'flex min-h-[128px] min-w-0 flex-col gap-1 rounded-[8px] bg-gray-50 hover:bg-gray-100 p-4 text-black no-underline'

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {previous ? (
        <Link
          className={`${cardClassName} justify-end`}
          params={{
            postSlug: previous.slug,
            seriesSlug,
          }}
          to="/blogs/$seriesSlug/$postSlug"
        >
          <span className="text-[24px] leading-none font-normal">上一篇</span>
          <span className="truncate text-[40px] leading-none font-normal">
            {previous.title}
          </span>
        </Link>
      ) : null}

      {next ? (
        <Link
          className={`${cardClassName} items-end justify-end text-right ${previous ? '' : 'sm:col-start-2'}`}
          params={{
            postSlug: next.slug,
            seriesSlug,
          }}
          to="/blogs/$seriesSlug/$postSlug"
        >
          <span className="text-[24px] leading-none font-normal">下一篇</span>
          <span className="truncate text-[40px] leading-none font-normal">
            {next.title}
          </span>
        </Link>
      ) : null}
    </div>
  )
}

export function BlogPostPageView({ page }: { page: VisibleBlogPostPageData }) {
  const chapterItems = getChapterItems(
    page.chapters,
    page.post_slug,
    page.series_status,
  )
  const siblingPosts = getSiblingPosts(page.chapters, page.post_slug)

  return (
    <div className="min-h-screen bg-gray-50 px-0 sm:px-6">
     <article className="mx-auto flex w-full max-w-[800px] flex-col sm:border-x border-gray-100 bg-white">
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
            seriesSlug={page.series_slug}
          />
        </section>

        <section className="px-6 pb-[120px] pt-6">
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
