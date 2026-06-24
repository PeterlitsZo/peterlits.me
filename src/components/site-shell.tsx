import { createContext, useContext, useEffect, useState } from 'react'
import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { X } from 'lucide-react'

import type { Viewer } from '../lib/auth'
import { login, logout as logoutRpc } from '../lib/auth-rpc'

type AuthControlsContextValue = {
  errorMessage: string | null
  isLoginModalOpen: boolean
  isPending: boolean
  isUserMenuOpen: boolean
  viewer: Viewer | null
  closeLoginModal: () => void
  openLoginModal: () => void
  submitLogin: (formData: FormData) => void
  toggleUserMenu: () => void
  logout: () => void
}

const AuthControlsContext = createContext<AuthControlsContextValue | null>(null)

function useAuthControls() {
  const value = useContext(AuthControlsContext)

  if (!value) {
    throw new Error('AuthTopBar must be rendered inside SiteShell')
  }

  return value
}

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

function LoginModal({
  errorMessage,
  isPending,
  onClose,
  onSubmit,
}: {
  isPending: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (formData: FormData) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[206px]">
      <button
        aria-label="关闭登录弹窗遮罩"
        className="absolute inset-0 bg-[#030712]/10"
        data-testid="login-modal-overlay"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="relative flex w-full max-w-[320px] flex-col gap-6 overflow-clip rounded-[12px] border border-[#D1D5DB] bg-white p-6"
        role="dialog"
      >
        <button
          aria-label="关闭登录弹窗"
          className="absolute right-[7px] top-[7px] flex items-center justify-center overflow-clip border-0 bg-transparent p-1 text-[#4B5563]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>

        <div className="flex h-16 w-full shrink-0 items-end">
          <h2
            className="m-0 text-[32px] leading-[normal] font-normal text-black"
            id="login-modal-title"
          >
            登录
          </h2>
        </div>

        <form
          className="flex w-full flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(new FormData(event.currentTarget))
          }}
        >
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
              <span>用户名</span>
              <input
                className="h-[37px] rounded-[8px] border border-[#E5E7EB] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#D1D5DB]"
                name="username"
                required
                type="text"
              />
            </label>

            <label className="flex flex-col gap-1 text-[12px] leading-[normal] font-normal text-black">
              <span>密码</span>
              <input
                className="h-[37px] rounded-[8px] border border-[#E5E7EB] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#D1D5DB]"
                name="password"
                required
                type="password"
              />
            </label>
          </div>

          {errorMessage ? (
            <p className="m-0 text-[14px] leading-5 text-[#B42318]">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex h-9 w-full shrink-0 items-center justify-end overflow-clip">
            <button
              className="inline-flex h-9 items-center justify-center rounded-[4px] border-0 bg-[#059669] px-8 text-[16px] leading-[normal] font-normal text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPending}
              type="submit"
            >
              登录
            </button>
          </div>
        </form>
      </section>
    </div>
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

export function SiteShell({
  children,
  viewer,
}: {
  children: React.ReactNode
  viewer: Viewer | null
}) {
  const router = useRouter()
  const loginAction = useServerFn(login)
  const logoutAction = useServerFn(logoutRpc)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setIsUserMenuOpen(false)
    setIsLoginModalOpen(false)
    setErrorMessage(null)
    setIsPending(false)
  }, [viewer])

  useEffect(() => {
    if (!isLoginModalOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setErrorMessage(null)
        setIsLoginModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLoginModalOpen])

  async function refreshViewerState() {
    await router.invalidate()
  }

  async function handleLoginSubmit(formData: FormData) {
    setIsPending(true)
    setErrorMessage(null)

    try {
      await loginAction({
        data: {
          username: String(formData.get('username') ?? ''),
          password: String(formData.get('password') ?? ''),
        },
      })
      await refreshViewerState()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '登录失败，请稍后再试'
      setErrorMessage(message)
    } finally {
      setIsPending(false)
    }
  }

  async function handleLogout() {
    setIsPending(true)

    try {
      await logoutAction()
      await refreshViewerState()
    } finally {
      setIsPending(false)
    }
  }

  function closeLoginModal() {
    setErrorMessage(null)
    setIsLoginModalOpen(false)
  }

  const authControls: AuthControlsContextValue = {
    errorMessage,
    isLoginModalOpen,
    isPending,
    isUserMenuOpen,
    viewer,
    closeLoginModal,
    openLoginModal: () => setIsLoginModalOpen(true),
    submitLogin: (formData) => void handleLoginSubmit(formData),
    toggleUserMenu: () => setIsUserMenuOpen((value) => !value),
    logout: () => void handleLogout(),
  }

  return (
    <AuthControlsContext.Provider value={authControls}>
      <div className="relative">{children}</div>

      {isLoginModalOpen ? (
        <LoginModal
          errorMessage={errorMessage}
          isPending={isPending}
          onClose={closeLoginModal}
          onSubmit={(formData) => void handleLoginSubmit(formData)}
        />
      ) : null}
    </AuthControlsContext.Provider>
  )
}
