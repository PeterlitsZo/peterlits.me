export type VisibleBlogSeriesListItem = {
  slug: string
  title: string
  description: string
  first_post_slug: string | null
  status: BlogSeriesStatus
}

export type BlogSeriesStatus = 'draft' | 'ongoing' | 'completed' | 'archived'
export type BlogPostStatus = 'draft' | 'published' | 'archived'

type VisibleBlogPostRecord = {
  series_id: number
  series_slug: string
  series_title: string
  series_description: string
  series_status: BlogSeriesStatus
  post_slug: string
  post_title: string
  post_summary: string
  post_content: string
  post_position: number
  post_status: BlogPostStatus
}

export type VisibleBlogPostChapterRecord = {
  id: number
  parent_post_id: number | null
  slug: string
  title: string
  position: number
  status: BlogPostStatus
}

export type VisibleBlogPostChapterNode = {
  id: number
  slug: string
  title: string
  position: number
  status: BlogPostStatus
  children: VisibleBlogPostChapterNode[]
}

export type VisibleBlogPostPageData = Omit<
  VisibleBlogPostRecord,
  'series_id'
> & {
  chapters: VisibleBlogPostChapterNode[]
}

function sortChapterNodes(
  nodes: VisibleBlogPostChapterNode[],
): VisibleBlogPostChapterNode[] {
  return nodes
    .toSorted(
      (left, right) => left.position - right.position || left.id - right.id,
    )
    .map((node) => ({
      ...node,
      children: sortChapterNodes(node.children),
    }))
}

export function buildBlogPostChapterTree(
  records: VisibleBlogPostChapterRecord[],
): VisibleBlogPostChapterNode[] {
  const nodesById = new Map<number, VisibleBlogPostChapterNode>()

  for (const record of records) {
    nodesById.set(record.id, {
      id: record.id,
      slug: record.slug,
      title: record.title,
      position: record.position,
      status: record.status,
      children: [],
    })
  }

  const roots: VisibleBlogPostChapterNode[] = []

  for (const record of records) {
    const node = nodesById.get(record.id)

    if (!node) {
      continue
    }

    if (record.parent_post_id === null) {
      roots.push(node)
      continue
    }

    const parent = nodesById.get(record.parent_post_id)

    if (parent) {
      parent.children.push(node)
    }
  }

  return sortChapterNodes(roots)
}
