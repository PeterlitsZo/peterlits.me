import { Link } from '@tanstack/react-router'
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry'

import type { VisiblePoemListItem } from '../../../lib/poem-models'
import type { Viewer } from '../../../lib/auth'
import { PoemCard } from '../../domain/poems/poem-card'
import { PageFrame } from '../../layout/page-frame'
import { PageHeader } from '../../layout/page-header'

export function PoemListPageView({
  poems,
  viewer,
}: {
  poems: VisiblePoemListItem[]
  viewer: Viewer | null
}) {
  const isOwner = viewer?.role === 'owner'

  return (
    <PageFrame ariaLabel="诗集" testId="poem-list-page">
      <PageHeader title="诗集" subtitle="笔墨之间，且听风吟" />

      {isOwner ? (
        <div className="flex w-full shrink-0 items-center px-6 py-3">
          <Link
            className="inline-flex h-8 items-center justify-center rounded-[4px] border-0 bg-[#059669] px-6 text-[16px] leading-[normal] font-normal text-white no-underline transition-opacity hover:opacity-90"
            to="/poems/new"
          >
            新建诗
          </Link>
        </div>
      ) : null}

      <section className="px-6 py-8" data-testid="poem-masonry-list">
        <ResponsiveMasonry columnsCountBreakPoints={{ 0: 1, 768: 2 }}>
          <Masonry gutter="16px">
            {poems.map((poem) => (
              <PoemCard key={poem.id} poem={poem} />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      </section>
    </PageFrame>
  )
}
