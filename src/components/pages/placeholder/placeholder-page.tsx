import { PageFrame } from '../../layout/page-frame'

export function PlaceholderPageView({ title }: { title: string }) {
  return (
    <PageFrame ariaLabel={title} outerClassName="px-0">
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-[20px] leading-none font-normal text-gray-500">
          敬请期待
        </p>
      </div>
    </PageFrame>
  )
}
