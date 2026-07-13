import { AuthTopBar } from '../../app/auth-top-bar'

export function PlaceholderPageView({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] px-0">
      <main
        aria-label={title}
        className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col overflow-clip border-x border-[#F3F4F6] bg-white"
      >
        <AuthTopBar />
        <div className="flex flex-1 items-center justify-center px-6 py-24">
          <p className="text-[20px] leading-none font-normal text-gray-500">
            敬请期待
          </p>
        </div>
      </main>
    </div>
  )
}
