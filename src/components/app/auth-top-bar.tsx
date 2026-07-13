import { Link, useLocation } from '@tanstack/react-router'

import { useAuthControls } from './site-shell'

function AvatarButton({
  displayName,
  onClick,
}: {
  displayName: string
  onClick: () => void
}) {
  return (
    <button
      aria-label="打开用户菜单"
      className="flex size-6 items-center justify-center rounded-full border-0 bg-transparent p-0"
      onClick={onClick}
      type="button"
    >
      <span className="flex size-6 items-center justify-center rounded-full border border-[#D36AA0] bg-[#FFF1F7] text-[12px] leading-none font-medium text-[#D36AA0]">
        {displayName.slice(0, 1) || '用'}
      </span>
    </button>
  )
}

type NavTab = {
  label: string
  to: string
  matchPrefix: string
}

const NAV_TABS: NavTab[] = [
  { label: '博客', to: '/blogs', matchPrefix: '/blogs' },
  { label: '诗', to: '/poems', matchPrefix: '/poems' },
  { label: '读书笔记', to: '/notes', matchPrefix: '/notes' },
]

function NavTabs() {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <nav aria-label="主导航" className="flex shrink-0 items-center gap-[32px]">
      {NAV_TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.matchPrefix)

        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex shrink-0 flex-col items-center justify-center gap-[4px] no-underline"
          >
            <p
              className={
                'whitespace-nowrap text-[16px] leading-normal ' +
                (isActive
                  ? 'font-semibold text-[#111827]'
                  : 'font-normal text-[#6b7280]')
              }
            >
              {tab.label}
            </p>
            <div
              className={
                'h-[2px] w-[24px] rounded-[1px] ' +
                (isActive ? 'bg-[#111827]' : 'bg-transparent')
              }
            />
          </Link>
        )
      })}
    </nav>
  )
}

export function AuthTopBar() {
  const {
    isPending,
    isUserMenuOpen,
    logout,
    openLoginModal,
    toggleUserMenu,
    viewer,
  } = useAuthControls()

  return (
    <div
      aria-label="顶部栏"
      className="flex h-[64px] w-full shrink-0 items-center gap-3 bg-white px-6 py-[18px]"
      role="toolbar"
    >
      <NavTabs />
      <div className="min-w-0 flex-1" />
      {viewer ? (
        <div className="relative flex w-6 shrink-0 items-center justify-between">
          <AvatarButton
            displayName={viewer.displayName}
            onClick={toggleUserMenu}
          />

          {isUserMenuOpen ? (
            <div className="absolute left-[-136px] top-8 flex w-[160px] min-w-[160px] flex-col gap-1.5 rounded-[12px] border border-[#D1D5DB] bg-white p-1.5">
              {viewer.role === 'owner' ? (
                <>
                  <Link
                    className="block w-full rounded-[6px] border-0 bg-[#F9FAFB] p-1.5 text-left text-[14px] leading-[normal] font-normal text-black hover:bg-[#F3F4F6]"
                    onClick={toggleUserMenu}
                    to="/series/new"
                  >
                    新建博客系列
                  </Link>
                  <Link
                    className="block w-full rounded-[6px] border-0 bg-transparent p-1.5 text-left text-[14px] leading-[normal] font-normal text-black hover:bg-[#F9FAFB]"
                    onClick={toggleUserMenu}
                    to="/poems/new"
                  >
                    新建诗
                  </Link>
                </>
              ) : null}
              <button
                className="w-full rounded-[6px] border-0 bg-transparent px-1.5 py-1 text-left text-[14px] leading-[normal] font-normal text-black hover:bg-[#F9FAFB]"
                disabled={isPending}
                onClick={logout}
                type="button"
              >
                登出
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          className="inline-flex h-6 items-center justify-center rounded-[4px] border-0 bg-[#F3F4F6] px-4 text-[13px] leading-[normal] font-normal text-black hover:bg-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D1D5DB]"
          onClick={openLoginModal}
          type="button"
        >
          登录
        </button>
      )}
    </div>
  )
}
