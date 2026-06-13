import bcrypt from 'bcryptjs'
import { env } from 'cloudflare:workers'
import { jwtVerify, SignJWT } from 'jose'

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

type UserRecord = Viewer & {
  passwordHash: string
}

export const AUTH_COOKIE_NAME = 'auth_token'
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function parseCookieHeader(cookieHeader: string) {
  if (!cookieHeader.trim()) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, pair) => {
    const [rawName, ...rawValue] = pair.split('=')
    const name = rawName?.trim()

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
  if (!viewer) {
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

function getJwtSecret() {
  const secret = env.AUTH_JWT_SECRET?.trim()

  if (!secret) {
    throw new Error('AUTH_JWT_SECRET is not configured')
  }

  return new TextEncoder().encode(secret)
}

export async function signAuthToken(viewer: Viewer) {
  return await new SignJWT({
    role: viewer.role,
    username: viewer.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(String(viewer.id))
    .sign(getJwtSecret())
}

export async function verifyAuthToken(token: string) {
  const result = await jwtVerify(token, getJwtSecret())
  return result.payload
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return await bcrypt.compare(password, passwordHash)
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

export async function loginWithPassword({
  db,
  password,
  username,
}: {
  db: D1Database
  username: string
  password: string
}) {
  const user = await db
    .prepare(
      `
        SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
    )
    .bind(username)
    .first<UserRecord>()

  if (!user) {
    throw new Error('用户名或密码错误')
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash)

  if (!passwordMatches) {
    throw new Error('用户名或密码错误')
  }

  const { passwordHash: _, ...viewer } = user
  return viewer
}
