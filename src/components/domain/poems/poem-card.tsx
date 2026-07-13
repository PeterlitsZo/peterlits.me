import type { VisiblePoemListItem } from '../../../lib/poem-models'

export function PoemCard({ poem }: { poem: VisiblePoemListItem }) {
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
