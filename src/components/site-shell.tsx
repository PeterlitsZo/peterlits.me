import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import type { Viewer } from '../lib/auth'
import { login, logout } from '../lib/auth-rpc'

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
      className="flex size-8 items-center justify-center rounded-full border-0 bg-transparent p-0"
      onClick={onClick}
      type="button"
    >
      <span className="flex size-6 items-center justify-center rounded-full border border-[#D36AA0] bg-[#FFF1F7] text-[12px] leading-none font-medium text-[#D36AA0]">
        {displayName.slice(0, 1) || '用'}
      </span>
    </button>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
      <button
        aria-label="关闭登录弹窗遮罩"
        className="absolute inset-0 bg-black/20"
        data-testid="login-modal-overlay"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-[320px] rounded-2xl border border-[#C9D2DE] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
        <button
          aria-label="关闭登录弹窗"
          className="absolute right-4 top-3 border-0 bg-transparent p-0 text-[36px] leading-none text-[#475467]"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <h2 className="text-[28px] leading-none font-medium text-black">登录</h2>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(new FormData(event.currentTarget))
          }}
        >
          <label className="flex flex-col gap-2 text-[16px] leading-none text-black">
            <span>用户名</span>
            <input
              className="h-9 rounded-[9px] border border-[#D0D5DD] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#12A26B]"
              name="username"
              required
              type="text"
            />
          </label>

          <label className="flex flex-col gap-2 text-[16px] leading-none text-black">
            <span>密码</span>
            <input
              className="h-9 rounded-[9px] border border-[#D0D5DD] px-3 text-[16px] text-black outline-none transition-colors focus:border-[#12A26B]"
              name="password"
              required
              type="password"
            />
          </label>

          {errorMessage ? (
            <p className="m-0 text-[14px] leading-5 text-[#B42318]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-2 flex justify-end">
            <button
              className="inline-flex h-9 min-w-[129px] items-center justify-center rounded-[4px] border-0 bg-[#079455] px-6 text-[24px] leading-none font-normal text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPending}
              type="submit"
            >
              登录
            </button>
          </div>
        </form>
      </div>
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
  const logoutAction = useServerFn(logout)
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

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-gray-50 via-gray-50/85 to-transparent" />
        <div className="pointer-events-none fixed left-1/2 top-0 z-10 h-full w-full max-w-[800px] -translate-x-1/2 border-x border-gray-100" />
        <div className="relative z-20 mx-auto flex w-full max-w-[800px] justify-end px-6 pt-5">
          {viewer ? (
            <div className="relative">
              <AvatarButton
                displayName={viewer.displayName}
                onClick={() => setIsUserMenuOpen((value) => !value)}
              />

              {isUserMenuOpen ? (
                <div className="absolute right-0 top-9 flex w-[162px] flex-col gap-1 rounded-[14px] border border-[#CBD5E1] bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                  <button
                    className="rounded-[8px] border-0 bg-transparent px-3 py-2 text-left text-[16px] leading-none text-black hover:bg-gray-50"
                    disabled={isPending}
                    onClick={() => void handleLogout()}
                    type="button"
                  >
                    登出
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              className="inline-flex h-8 items-center justify-center rounded-[7px] border border-[#EAECF0] bg-[#F8FAFC] px-4 text-[16px] leading-none text-black hover:bg-white"
              onClick={() => setIsLoginModalOpen(true)}
              type="button"
            >
              登录
            </button>
          )}
        </div>

        {children}
      </div>

      {isLoginModalOpen ? (
        <LoginModal
          errorMessage={errorMessage}
          isPending={isPending}
          onClose={() => {
            setErrorMessage(null)
            setIsLoginModalOpen(false)
          }}
          onSubmit={(formData) => void handleLoginSubmit(formData)}
        />
      ) : null}
    </>
  )
}
