export function DraftBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F2F4F7] px-2 py-1 text-[12px] leading-none font-medium text-[#475467]">
      {children}
    </span>
  )
}
