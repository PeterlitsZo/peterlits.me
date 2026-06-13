export type AuthRole = 'owner' | 'reviewer'

export type Viewer = {
  id: number
  username: string
  displayName: string
  role: AuthRole
}

export type ViewerBlogVisibility = {
  seriesStatuses: Array<'draft' | 'ongoing' | 'completed' | 'archived'>
  postStatuses: Array<'draft' | 'published' | 'archived'>
}

export const AUTH_COOKIE_NAME = 'auth_token'
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function isAuthRole(role: unknown): role is AuthRole {
  return role === 'owner' || role === 'reviewer'
}

export function parseCookieHeader(cookieHeader: string) {
  if (!cookieHeader.trim()) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, pair) => {
    const [rawName, ...rawValue] = pair.split('=')
    const name = rawName.trim()

    if (!name) {
      return cookies
    }

    cookies[name] = rawValue.join('=').trim()
    return cookies
  }, {})
}

export function getViewerBlogVisibility(
  viewer: Viewer | null,
): ViewerBlogVisibility {
  if (!viewer || !isAuthRole(viewer.role)) {
    return {
      seriesStatuses: ['ongoing', 'completed', 'archived'],
      postStatuses: ['published', 'archived'],
    }
  }

  return {
    seriesStatuses: ['draft', 'ongoing', 'completed', 'archived'],
    postStatuses: ['draft', 'published', 'archived'],
  }
}

function buildCookieParts({
  secure,
  token,
}: {
  token: string
  secure: boolean
}) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`,
  ]

  if (secure) {
    parts.push('Secure')
  }

  return parts
}

export function buildAuthCookie(token: string, secure = true) {
  return buildCookieParts({
    token,
    secure,
  }).join('; ')
}

export function clearAuthCookie(secure = true) {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
  ]

  if (secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export function validateLoginInput(data: unknown) {
  if (!data || typeof data !== 'object') {
    throw new Error('用户名或密码错误')
  }

  const username =
    typeof data.username === 'string' ? data.username.trim() : ''
  const password = typeof data.password === 'string' ? data.password : ''

  if (!username || !password) {
    throw new Error('用户名或密码错误')
  }

  return {
    username,
    password,
  }
}
