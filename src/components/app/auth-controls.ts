import { createContext, useContext } from 'react'

import type { Viewer } from '../../lib/auth'

export type AuthControlsContextValue = {
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

export const AuthControlsContext =
  createContext<AuthControlsContextValue | null>(null)

export function useAuthControls() {
  const value = useContext(AuthControlsContext)

  if (!value) {
    throw new Error('AuthTopBar must be rendered inside SiteShell')
  }

  return value
}
