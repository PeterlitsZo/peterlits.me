import { Link } from '@tanstack/react-router'
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry'

import type { VisiblePoemListItem } from '../lib/poem-models'
import type { Viewer } from '../lib/auth'
import { AuthTopBar } from './site-shell'

export function PoemListPageView({
  poems,
  viewer,
}: {
  poems: VisiblePoemListItem[]
  viewer: Viewer | null
}) {
  const isOwner = viewer?.role === 'owner'

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="poem-list-page">
      <main
        aria-label="诗集"
        className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col overflow-clip border-x border-[#F3F4F6] bg-white"
      >
        <AuthTopBar />

        <header className="flex h-[300px] shrink-0 flex-col justify-end overflow-clip p-6">
          <h1 className="text-[48px] leading-none font-normal text-[#030712]">
            诗集
          </h1>
          <p className="mt-2 text-[24px] leading-none font-normal text-[#4A5565]">
            笔墨之间，且听风吟
          </p>
        </header>

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

        <div className="min-h-0 flex-1" />
      </main>
    </div>
  )
}

function PoemCard({ poem }: { poem: VisiblePoemListItem }) {
  return (
    <article className="flex w-full flex-col gap-3 rounded-[12px] bg-[#F9FAFB] p-5">
      <h2 className="m-0 text-[18px] font-medium text-[#030712]">
        {poem.title}
      </h2>
      <p className="m-0 whitespace-pre-wrap text-[16px] leading-[1.8] text-[#4A5565]">
        {poem.content}
      </p>
    </article>
  )
}
