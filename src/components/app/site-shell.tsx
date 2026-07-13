import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import type { Viewer } from '../../lib/auth'
import { login, logout as logoutRpc } from '../../lib/auth-rpc'
import { AuthControlsContext } from './auth-controls'
import type { AuthControlsContextValue } from './auth-controls'
import { LoginModal } from './login-modal'

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
