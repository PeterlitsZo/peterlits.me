import { AuthTopBar } from '../app/auth-top-bar'

export function PageFrame({
  ariaLabel,
  children,
  outerClassName = '',
  testId,
}: {
  ariaLabel: string
  children: React.ReactNode
  outerClassName?: string
  testId?: string
}) {
  const className = ['min-h-screen bg-[#F9FAFB]', outerClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} data-testid={testId}>
      <main
        aria-label={ariaLabel}
        className="mx-auto flex min-h-screen w-full max-w-[800px] flex-col overflow-clip border-x border-[#F3F4F6] bg-white"
      >
        <AuthTopBar />
        {children}
        <div className="min-h-0 flex-1" />
      </main>
    </div>
  )
}
