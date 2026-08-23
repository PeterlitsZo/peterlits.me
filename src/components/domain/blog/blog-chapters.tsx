import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { BadgePlus, GripVertical, Pencil } from 'lucide-react'
import { clsx } from 'clsx'

import type {
  BlogPostStatus,
  BlogSeriesStatus,
  VisibleBlogPostChapterNode,
  VisibleBlogPostPageData,
} from '../../../lib/blog-models'

import styles from './blog-chapters.module.css'

type FlatChapter = Omit<VisibleBlogPostChapterNode, 'children'>

type ChapterItem =
  | {
      kind: 'post'
      id: number
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

export type FlatEditableChapterItem = {
  id: number
  slug: string
  title: string
  position: number
  status: BlogPostStatus
  depth: number
  parentPostId: number | null
}

export type ReorderBlogPostPayloadItem = {
  id: number
  parentPostId: number | null
  position: number
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

export function flattenEditableChapterTree(
  chapters: VisibleBlogPostChapterNode[],
  depth = 0,
  parentPostId: number | null = null,
): FlatEditableChapterItem[] {
  return chapters.flatMap((chapter) => [
    {
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      position: chapter.position,
      status: chapter.status,
      depth,
      parentPostId,
    },
    ...flattenEditableChapterTree(chapter.children, depth + 1, chapter.id),
  ])
}

function findParentIdForFlatItem(
  items: FlatEditableChapterItem[],
  index: number,
) {
  const item = items[index]

  if (item.depth === 0) {
    return null
  }

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (items[cursor].depth === item.depth - 1) {
      return items[cursor].id
    }
  }

  return null
}

export function buildReorderPayloadFromFlatItems(
  items: FlatEditableChapterItem[],
): ReorderBlogPostPayloadItem[] {
  const nextPositionByParent = new Map<number | null, number>()

  return items.map((item, index) => {
    const parentPostId = findParentIdForFlatItem(items, index)
    const position = nextPositionByParent.get(parentPostId) ?? 1
    nextPositionByParent.set(parentPostId, position + 1)

    return {
      id: item.id,
      parentPostId,
      position,
    }
  })
}

export function canMoveFlatChapter(
  items: FlatEditableChapterItem[],
  sourceIndex: number,
  targetIndex: number,
) {
  if (
    sourceIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex < 0 ||
    targetIndex >= items.length
  ) {
    return false
  }

  const source = items[sourceIndex]

  if (targetIndex <= sourceIndex) {
    return true
  }

  for (let cursor = sourceIndex + 1; cursor < items.length; cursor += 1) {
    const candidate = items[cursor]

    if (candidate.depth <= source.depth) {
      return true
    }

    if (cursor === targetIndex) {
      return false
    }
  }

  return true
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
        id: chapter.id,
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
    <span className="inline-flex h-[24px] items-center justify-center rounded-[8px] border border-[#9CA3AF] bg-[#E5E7EB] px-3 text-[12px] leading-none font-normal text-black">
      {children}
    </span>
  )
}

export function StatusBadge({
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

export function BlogPostChapterList({
  chapterItems,
  chapters = [],
  isOwner = false,
  onReorder,
  seriesSlug,
}: {
  chapterItems: ChapterItem[]
  chapters?: VisibleBlogPostChapterNode[]
  isOwner?: boolean
  onReorder?: (posts: ReorderBlogPostPayloadItem[]) => Promise<void>
  seriesSlug: string
}) {
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const navigate = useNavigate()
  const editableItems = useMemo(
    () => flattenEditableChapterTree(chapters),
    [chapters],
  )
  const numberBaseClassName =
    'flex size-[22px] shrink-0 items-center justify-center rounded-[8px] text-[13px] leading-none font-normal tracking-[-0.65px] text-white'
  const titleBaseClassName =
    'flex-1 shrink-0 whitespace-nowrap text-[20px] leading-[24px] font-normal'

  return (
    <div className="flex w-full max-w-[500px] flex-col items-start gap-1.5 overflow-hidden rounded-[12px] bg-[#F9FAFB] p-3">
      {chapterItems.map((item) => {
        const isCurrent = item.kind === 'post' && item.isCurrent
        const numberClassName = isCurrent
          ? 'bg-gray-950 text-white'
          : 'bg-gray-500 text-white'
        const titleClassName = isCurrent ? 'text-gray-950' : 'text-gray-500'
        const paddingLeft = `${6 + item.depth * 26}px`

        const sourceIndex =
          item.kind === 'post'
            ? editableItems.findIndex(
                (editableItem) => editableItem.id === item.id,
              )
            : -1

        async function handleDrop(targetDepth: number) {
          if (!onReorder || draggedId === null || item.kind !== 'post') {
            return
          }

          const draggedIndex = editableItems.findIndex(
            (editableItem) => editableItem.id === draggedId,
          )
          const targetIndex = editableItems.findIndex(
            (editableItem) => editableItem.id === item.id,
          )

          if (
            draggedIndex === -1 ||
            targetIndex === -1 ||
            draggedIndex === targetIndex ||
            !canMoveFlatChapter(editableItems, draggedIndex, targetIndex)
          ) {
            return
          }

          const nextItems = [...editableItems]
          const [draggedItem] = nextItems.splice(draggedIndex, 1)

          const adjustedTargetIndex =
            draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
          const maxDepth = Math.max(
            0,
            (nextItems[adjustedTargetIndex]?.depth ?? 0) + 1,
          )
          const depth = Math.min(Math.max(0, targetDepth), maxDepth)

          nextItems.splice(adjustedTargetIndex + 1, 0, {
            ...draggedItem,
            depth,
          })

          try {
            setReorderError(null)
            await onReorder(buildReorderPayloadFromFlatItems(nextItems))
          } catch (error) {
            setReorderError(
              error instanceof Error
                ? error.message
                : '排序保存失败，请稍后再试',
            )
          } finally {
            setDraggedId(null)
          }
        }

        const managementControlClassName = `flex size-6 shrink-0 items-center justify-center overflow-clip rounded-sm text-[#4B5563] no-underline hover:bg-[#E5E7EB]`

        // The management controls.
        const managementControls =
          item.kind === 'post' && isOwner ? (
            <div
              className={clsx(
                `flex items-center gap-1.5`,
                styles.ManagementControls,
              )}
            >
              <Link
                aria-label={`更新博客：${item.title}`}
                className={managementControlClassName}
                params={{ postSlug: item.slug, seriesSlug }}
                to="/blogs/$seriesSlug/$postSlug/edit"
              >
                <Pencil aria-hidden="true" className="size-4" strokeWidth={2} />
              </Link>
              <Link
                aria-label={`添加子博客：${item.title}`}
                className={managementControlClassName}
                search={{ parent: item.slug }}
                params={{ seriesSlug }}
                to="/blogs/$seriesSlug/new"
              >
                <BadgePlus
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2}
                />
              </Link>
              <button
                aria-label={`拖动排序：${item.title}`}
                draggable={Boolean(onReorder)}
                onDragStart={(event) => {
                  setDraggedId(item.id)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', String(item.id))
                }}
                onDragEnd={() => setDraggedId(null)}
                className={clsx(managementControlClassName, 'cursor-grab')}
                type="button"
              >
                <GripVertical
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2}
                />
              </button>
            </div>
          ) : null

        const titleContent =
          item.kind === 'post' ? (
            <span
              className={`flex min-w-0 items-center gap-2 ${titleBaseClassName} ${titleClassName}`}
            >
              <span className="truncate">{item.title}</span>
              <StatusBadge label="草稿" status={item.status} />
            </span>
          ) : (
            <span className={`${titleBaseClassName} text-gray-500`}>
              未完待续......
            </span>
          )

        const chapterContent = (
          <>
            <span className={`${numberBaseClassName} ${numberClassName}`}>
              {item.label}
            </span>
            {titleContent}
          </>
        )
        const chapterTargetClassName = clsx(
          'flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-[6px] py-1.5 pr-1.5',
          item.kind === 'post' &&
            !item.isCurrent &&
            'cursor-pointer hover:bg-[#F3F4F6]',
        )

        function navigateToChapter() {
          if (item.kind !== 'post' || item.isCurrent) {
            return
          }

          void navigate({
            params: { postSlug: item.slug, seriesSlug },
            to: '/blogs/$seriesSlug/$postSlug',
          })
        }

        return (
          <div
            data-testid={
              item.kind === 'post' ? `chapter-row-${item.slug}` : undefined
            }
            onDragOver={(event) => {
              if (draggedId !== null && sourceIndex !== -1) {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              const targetDepth =
                event.clientX > 24 ? item.depth + 1 : item.depth
              void handleDrop(targetDepth)
            }}
            className={clsx(
              `flex w-full items-stretch gap-1.5 overflow-hidden`,
              styles.Row,
            )}
            key={item.kind === 'post' ? item.slug : 'pending'}
          >
            {item.kind === 'post' && !item.isCurrent ? (
              <div
                aria-label={`${item.label}${item.title}`}
                className={chapterTargetClassName}
                onClick={navigateToChapter}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigateToChapter()
                  }
                }}
                role="link"
                style={{ paddingLeft }}
                tabIndex={0}
              >
                {chapterContent}
                {managementControls}
              </div>
            ) : (
              <div className={chapterTargetClassName} style={{ paddingLeft }}>
                {chapterContent}
                {managementControls}
              </div>
            )}
          </div>
        )
      })}
      {isOwner ? (
        <div className="flex w-full items-center overflow-clip px-1.5 pt-3">
          <Link
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-[4px] bg-[#059669] px-6 text-[16px] leading-[normal] font-normal text-white no-underline hover:opacity-90"
            params={{ seriesSlug }}
            to="/blogs/$seriesSlug/new"
          >
            新建博客
          </Link>
        </div>
      ) : null}
      {reorderError ? (
        <p
          role="alert"
          className="m-0 px-1.5 text-[14px] leading-5 text-[#B42318]"
        >
          {reorderError}
        </p>
      ) : null}
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
