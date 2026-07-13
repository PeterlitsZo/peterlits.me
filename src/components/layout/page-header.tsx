export function PageHeader({
  subtitle,
  subtitleClassName = 'text-[#4A5565]',
  title,
  titleClassName = 'text-[48px] text-[#030712]',
}: {
  subtitle?: React.ReactNode
  subtitleClassName?: string
  title: React.ReactNode
  titleClassName?: string
}) {
  return (
    <header className="flex h-[300px] shrink-0 flex-col justify-end overflow-clip p-6">
      <h1 className={`leading-none font-normal ${titleClassName}`}>{title}</h1>
      {subtitle ? (
        <p className={`mt-2 text-[24px] leading-none font-normal ${subtitleClassName}`}>
          {subtitle}
        </p>
      ) : null}
    </header>
  )
}
